FROM nginx:alpine@sha256:72ba65eb42c10344912a84ff42408db7d34f2feb642204570ab8fc5ffd29f1d3

COPY config/nginx-main.conf /etc/nginx/nginx.conf
COPY config/nginx.conf /etc/nginx/conf.d/default.conf
COPY site/ /usr/share/nginx/html/
RUN find /usr/share/nginx/html -type d -exec chmod 755 {} + \
  && find /usr/share/nginx/html -type f -exec chmod 644 {} +

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=3s --retries=6 \
  CMD wget -qO- http://127.0.0.1:8080/release.json >/dev/null || exit 1

ENTRYPOINT ["nginx", "-g", "daemon off;"]
