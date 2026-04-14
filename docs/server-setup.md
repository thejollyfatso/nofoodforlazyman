# Server Setup — DigitalOcean Droplet

## systemd unit file for uvicorn

The CI deploy job (`sudo systemctl restart nf4lm`) requires a systemd service
to be configured on the droplet. This is a one-time setup step.

### 1. Create the unit file

SSH into the droplet and create `/etc/systemd/system/nf4lm.service`:

```ini
[Unit]
Description=nf4lm FastAPI app
After=network.target

[Service]
WorkingDirectory=/home/gomburza/dev/nofoodforlazyman
ExecStart=/home/gomburza/dev/nofoodforlazyman/.venv/bin/uvicorn server.main:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

### 2. Enable and start the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable nf4lm
sudo systemctl start nf4lm
```

### 3. Allow the deploy user to restart without a password prompt

The CI deploy script runs `sudo systemctl restart nf4lm` over SSH. Add a
passwordless sudoers rule for that command so it doesn't hang waiting for input:

```bash
echo "$SSH_USERNAME ALL=(ALL) NOPASSWD: /bin/systemctl restart nf4lm" \
  | sudo tee /etc/sudoers.d/nf4lm
```

Replace `$SSH_USERNAME` with the value of the `SSH_USERNAME` GitHub secret.

### 4. Verify

```bash
sudo systemctl status nf4lm
```

After this, every push to `main` will automatically pull, rebuild, and restart
the service via the CI deploy job.
