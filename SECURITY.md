# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | Yes                |

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability in ANFSF, please follow these steps:

1. **Do NOT open a public issue** for security vulnerabilities
2. Email your findings to the project maintainers at **security@anfsf.dev** (or open a private issue if email is unavailable)
3. Include:
   - A description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

## Response Process

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days
- **Fix Timeline**: Within 30 days for critical issues
- **Disclosure**: Coordinated disclosure after fix is released

## Security Best Practices for Deployment

- Always set `ANFSF_API_TOKEN` in production
- Never commit `.env` files to version control
- Use strong passwords for `POSTGRES_PASSWORD` and `GRAFANA_ADMIN_PASSWORD`
- Enable `ANFSF_BLOCK_INJECTIONS=true` to block prompt injection attempts
- Keep dependencies updated: `npm audit` and `snyk test`
- Use HTTPS behind a reverse proxy (nginx, Caddy)
- Do not expose PostgreSQL or Redis ports to the public internet
- Regularly rotate API keys and tokens
