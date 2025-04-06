# ---- Base Stage ----
# Use a specific LTS Node.js version on Alpine Linux for smaller size
# Replace '20' with your required Node.js major version if different
FROM node:current AS base
# Set working directory
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
# Install dependencies first to leverage Docker layer caching
FROM base AS deps
# Copy only package files
COPY package.json package-lock.json* ./
# Use 'npm ci' for deterministic installs based on lock file (recommended)
RUN npm ci

# ---- Builder Stage ----
# Build the Next.js application
FROM base AS builder
# Set working directory again for clarity (inherits from 'base')
WORKDIR /usr/src/app
# Copy installed dependencies from the 'deps' stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
# Copy the rest of your application code (respects .dockerignore)
COPY . .

# --- Build-time Environment Variables ---
# These ARGs are passed during the 'docker build' command
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
# Add ARG for any other required build-time environment variables

# These ENVs make the ARGs available to the 'npm run build' process
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
# Add ENV lines for any other args you declared above
# --- End Build-time ---

# --- Optional Debug Lines (can be removed for final image) ---
RUN echo "DEBUG Build Stage: Supabase URL is $NEXT_PUBLIC_SUPABASE_URL"
RUN echo "DEBUG Build Stage: Supabase Anon Key is $NEXT_PUBLIC_SUPABASE_ANON_KEY" | cut -c 1-10 # Only echo first few chars of key
# --- End Debug ---

# IMPORTANT: Ensure your next.config.js file has 'output: "standalone"' enabled!
# Build the Next.js application
RUN npm run build

# ---- Runner Stage (Production) ----
# Use the same small Alpine base image
FROM node:current AS runner
WORKDIR /usr/src/app

# Set environment to production
ENV NODE_ENV=production
# Optionally disable Next.js telemetry
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user and group for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# --- Runtime Environment Variables ---
# Although defined here using ARG/ENV for clarity if needed within this stage,
# these primarily need to be provided when RUNNING the container (e.g., docker run -e ..., docker-compose, k8s)
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
# --- End Runtime ---

# Copy only the necessary artifacts from the 'builder' stage
# Ensure ownership is set to the non-root user
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /usr/src/app/public ./public

# Switch to the non-root user
USER nextjs

EXPOSE 10000

# Set the default command to start the Node.js server directly
# This uses the server.js file included in the .next/standalone output
CMD ["node", "server.js"]