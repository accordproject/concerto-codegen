# Pull the .NET 8 SDK from the official Alpine image (proposal: dotnet/sdk:8.0-alpine)
# and layer it onto the shared Node-based verify base, which provides the Concerto
# CLI + branch codegen used to generate the C# before `dotnet build`.
ARG BASE_IMAGE=concerto-verify-base:local
FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS dotnet
FROM ${BASE_IMAGE}

# Runtime libraries required by the .NET SDK on Alpine (musl).
RUN apk add --no-cache libstdc++ icu-libs

# Copy the SDK from the official image.
COPY --from=dotnet /usr/share/dotnet /usr/share/dotnet
ENV DOTNET_ROOT=/usr/share/dotnet \
    PATH="/usr/share/dotnet:${PATH}" \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1

COPY verification/docker/csharp/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
