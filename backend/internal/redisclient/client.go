package redisclient

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"net"
	"strconv"
	"strings"
	"sync"
	"time"
)

type StreamMessage struct {
	ID     string
	Values map[string]string
}

type Client struct {
	addr    string
	mu      sync.Mutex
	conn    net.Conn
	reader  *bufio.Reader
	timeout time.Duration
}

func NewClient(addr string) *Client {
	if addr == "" {
		addr = "localhost:6379"
	}
	return &Client{
		addr:    addr,
		timeout: 3 * time.Second,
	}
}

func (c *Client) connect() error {
	if c.conn != nil {
		return nil
	}
	conn, err := net.DialTimeout("tcp", c.addr, c.timeout)
	if err != nil {
		return fmt.Errorf("failed to connect to redis at %s: %w", c.addr, err)
	}
	c.conn = conn
	c.reader = bufio.NewReader(conn)
	return nil
}

func (c *Client) closeConnection() {
	if c.conn != nil {
		_ = c.conn.Close()
		c.conn = nil
		c.reader = nil
	}
}

func (c *Client) executeCommand(args ...string) (interface{}, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for attempt := 0; attempt < 2; attempt++ {
		if err := c.connect(); err != nil {
			return nil, err
		}

		_ = c.conn.SetDeadline(time.Now().Add(c.timeout))

		// Format RESP Array
		var buf bytes.Buffer
		buf.WriteString(fmt.Sprintf("*%d\r\n", len(args)))
		for _, arg := range args {
			buf.WriteString(fmt.Sprintf("$%d\r\n%s\r\n", len(arg), arg))
		}

		if _, err := c.conn.Write(buf.Bytes()); err != nil {
			c.closeConnection()
			continue
		}

		res, err := c.parseRESP()
		if err != nil {
			c.closeConnection()
			continue
		}
		return res, nil
	}

	return nil, fmt.Errorf("redis command failed after retry")
}

func (c *Client) parseRESP() (interface{}, error) {
	prefix, err := c.reader.ReadByte()
	if err != nil {
		return nil, err
	}

	switch prefix {
	case '+': // Simple String
		line, err := c.readLine()
		return line, err
	case '-': // Error
		line, _ := c.readLine()
		return nil, fmt.Errorf("redis error: %s", line)
	case ':': // Integer
		line, err := c.readLine()
		if err != nil {
			return nil, err
		}
		return strconv.ParseInt(line, 10, 64)
	case '$': // Bulk String
		line, err := c.readLine()
		if err != nil {
			return nil, err
		}
		length, err := strconv.Atoi(line)
		if err != nil {
			return nil, err
		}
		if length == -1 {
			return nil, nil // Null Bulk String
		}
		data := make([]byte, length+2) // data + \r\n
		if _, err := io.ReadFull(c.reader, data); err != nil {
			return nil, err
		}
		return string(data[:length]), nil
	case '*': // Array
		line, err := c.readLine()
		if err != nil {
			return nil, err
		}
		count, err := strconv.Atoi(line)
		if err != nil {
			return nil, err
		}
		if count == -1 {
			return nil, nil
		}
		arr := make([]interface{}, count)
		for i := 0; i < count; i++ {
			arr[i], err = c.parseRESP()
			if err != nil {
				return nil, err
			}
		}
		return arr, nil
	default:
		return nil, fmt.Errorf("unrecognized RESP prefix: %c", prefix)
	}
}

func (c *Client) readLine() (string, error) {
	line, err := c.reader.ReadString('\n')
	if err != nil {
		return "", err
	}
	return strings.TrimRight(line, "\r\n"), nil
}

func (c *Client) Ping() error {
	res, err := c.executeCommand("PING")
	if err != nil {
		return err
	}
	if str, ok := res.(string); ok && strings.EqualFold(str, "PONG") {
		return nil
	}
	return fmt.Errorf("unexpected ping response: %v", res)
}

func (c *Client) XAdd(stream string, values map[string]string) (string, error) {
	args := []string{"XADD", stream, "*"}
	for k, v := range values {
		args = append(args, k, v)
	}
	res, err := c.executeCommand(args...)
	if err != nil {
		return "", err
	}
	if id, ok := res.(string); ok {
		return id, nil
	}
	return "", fmt.Errorf("invalid xadd response")
}

func (c *Client) XLen(stream string) (int64, error) {
	res, err := c.executeCommand("XLEN", stream)
	if err != nil {
		return 0, err
	}
	if n, ok := res.(int64); ok {
		return n, nil
	}
	return 0, nil
}

func (c *Client) XRead(stream string, count int, lastID string) ([]StreamMessage, error) {
	if lastID == "" {
		lastID = "0-0"
	}
	args := []string{"XREAD", "COUNT", strconv.Itoa(count), "STREAMS", stream, lastID}
	res, err := c.executeCommand(args...)
	if err != nil {
		return nil, err
	}

	rawArr, ok := res.([]interface{})
	if !ok || len(rawArr) == 0 {
		return nil, nil
	}

	streamItem, ok := rawArr[0].([]interface{})
	if !ok || len(streamItem) < 2 {
		return nil, nil
	}

	messagesArr, ok := streamItem[1].([]interface{})
	if !ok {
		return nil, nil
	}

	var results []StreamMessage
	for _, m := range messagesArr {
		entry, ok := m.([]interface{})
		if !ok || len(entry) < 2 {
			continue
		}
		id, _ := entry[0].(string)
		fields, ok := entry[1].([]interface{})
		if !ok {
			continue
		}
		valMap := make(map[string]string)
		for i := 0; i+1 < len(fields); i += 2 {
			k, _ := fields[i].(string)
			v, _ := fields[i+1].(string)
			valMap[k] = v
		}
		results = append(results, StreamMessage{
			ID:     id,
			Values: valMap,
		})
	}
	return results, nil
}

func (c *Client) XTrimMaxLen(stream string, maxLen int64) error {
	_, err := c.executeCommand("XTRIM", stream, "MAXLEN", "~", strconv.FormatInt(maxLen, 10))
	return err
}

func (c *Client) SAdd(key, member string) error {
	_, err := c.executeCommand("SADD", key, member)
	return err
}

func (c *Client) SIsMember(key, member string) (bool, error) {
	res, err := c.executeCommand("SISMEMBER", key, member)
	if err != nil {
		return false, err
	}
	if n, ok := res.(int64); ok {
		return n == 1, nil
	}
	return false, nil
}

func (c *Client) HIncrBy(key, field string, incr int64) (int64, error) {
	res, err := c.executeCommand("HINCRBY", key, field, strconv.FormatInt(incr, 10))
	if err != nil {
		return 0, err
	}
	if n, ok := res.(int64); ok {
		return n, nil
	}
	return 0, nil
}

func (c *Client) Close() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.closeConnection()
}
