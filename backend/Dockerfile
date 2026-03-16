FROM oven/bun:1 AS base
WORKDIR /app

# Install git and semgrep for real security scanning
RUN apt-get update && \
    apt-get install -y --no-install-recommends git python3 python3-pip && \
    pip3 install semgrep --break-system-packages && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY . .

# Create data directories
RUN mkdir -p /app/data /app/repos

ENV NODE_ENV=production
ENV DATABASE_PATH=/app/data/zcrx.db
ENV REPOS_PATH=/app/repos
ENV PORT=8000

EXPOSE 8000

CMD ["bun", "run", "src/index.ts"]
