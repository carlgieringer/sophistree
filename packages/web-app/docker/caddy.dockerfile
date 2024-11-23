# Multistage docker file providing Caddy with S3 storage

FROM caddy:2.8.4-builder AS builder

RUN xcaddy build \
    --with github.com/ss098/certmagic-s3

FROM caddy:2.8.4

COPY --from=builder /usr/bin/caddy /usr/bin/caddy
