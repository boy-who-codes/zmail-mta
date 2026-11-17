FROM alpine:3.20

RUN apk add --no-cache dovecot shadow bash

# Create vmail user and group with UID/GID 5000
RUN groupadd -g 5000 vmail && \
    useradd -u 5000 -g vmail -s /sbin/nologin -d /var/mail vmail && \
    mkdir -p /var/mail && \
    chown -R vmail:vmail /var/mail

COPY dovecot.conf /etc/dovecot/dovecot.conf
COPY users /etc/dovecot/users

RUN chmod 600 /etc/dovecot/users

EXPOSE 143 993

CMD ["dovecot", "-F"]
