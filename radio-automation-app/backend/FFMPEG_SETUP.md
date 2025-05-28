# FFmpeg Installation Guide for Radio Automation System

The Radio Automation System requires FFmpeg for advanced audio processing features including:
- Audio trimming and cutting
- Format conversion (WAV → MP3, etc.)
- Audio normalization and effects
- Metadata embedding

## Windows Installation

### Method 1: Chocolatey (Recommended)
1. Install Chocolatey package manager: https://chocolatey.org/install
2. Open Command Prompt as Administrator
3. Run: `choco install ffmpeg`

### Method 2: Manual Installation
1. Download FFmpeg from: https://ffmpeg.org/download.html#build-windows
2. Extract to `C:\ffmpeg`
3. Add `C:\ffmpeg\bin` to your Windows PATH environment variable
4. Restart your computer

### Method 3: Windows Package Manager
1. Open Command Prompt as Administrator
2. Run: `winget install Gyan.FFmpeg`

## macOS Installation

### Method 1: Homebrew (Recommended)
1. Install Homebrew: https://brew.sh/
2. Run: `brew install ffmpeg`

### Method 2: MacPorts
1. Install MacPorts: https://www.macports.org/
2. Run: `sudo port install ffmpeg`

## Linux Installation

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install ffmpeg
```

### CentOS/RHEL/Fedora
```bash
# Fedora
sudo dnf install ffmpeg

# CentOS/RHEL (requires EPEL)
sudo yum install epel-release
sudo yum install ffmpeg
```

## Verification

After installation, verify FFmpeg is working:
```bash
ffmpeg -version
```

You should see version information and available codecs.

## Troubleshooting

### "FFmpeg not found" Error
- Ensure FFmpeg is in your system PATH
- Try restarting the application after installation
- On Windows, you may need to restart your computer

### Permission Issues
- On macOS/Linux, ensure you have proper permissions
- Try running with `sudo` if needed during installation

### Audio Processing Fallback
If FFmpeg is not available, the system will:
- Fall back to simple file copying
- Log a warning message
- Continue processing without advanced audio features

## Docker Installation

If using Docker, add FFmpeg to your Dockerfile:
```dockerfile
RUN apt-get update && apt-get install -y ffmpeg
```

## Support

For installation issues:
1. Check the system logs for specific error messages
2. Verify FFmpeg installation with `ffmpeg -version`
3. Ensure the application has permission to execute FFmpeg
4. Contact support with your operating system details 