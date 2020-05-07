FROM fthomas/scala-steward:latest
RUN apk --no-cache add gnupg
RUN apk --no-cache add curl
RUN apk --no-cache add bash
RUN apk --no-cache add jq
RUN apk --no-cache add git
RUN apk --no-cache add ca-certificates
ENV PATH="/opt/docker/sbt/bin:${PATH}"
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]
