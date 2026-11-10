OPEN GAME MASTER — WINDOWS LAUNCHER

START
1. Keep Start-OpenGameMaster.exe in this project folder, beside package.json.
2. Double-click Start-OpenGameMaster.exe.
3. On the first run it calls the project's official setup command:
   - creates the database encryption key in .env.server;
   - downloads/builds the Open5e content pack;
   - fetches the embedding model when network access permits;
   - builds the production app.
4. It starts the production web server, waits for its health endpoint and opens
   the browser. The first browser link includes the one-time administrator
   setup code. Create your admin account there.
5. Leave the console window open while playing. Press Ctrl+C in that window
   to stop the server.

ADDRESS
This launcher listens on port 3005:
  This computer: http://127.0.0.1:3005
  Other computers on the LAN: http://<this-computer-LAN-IP>:3005

Windows Firewall may ask whether Node.js may accept private-network
connections. Allow Private networks only when you intend to use OGM over LAN.
The launcher does not change firewall settings.

REQUIREMENTS
- Windows 10/11 x64
- Node.js 22.18+, 24 or 26+ with npm
- This project folder, including node_modules and the production build
- Internet access for first-time content/model downloads (the app may still
  start with the bundled SRD if the content pack cannot be downloaded)

IMPORTANT
- This EXE is a launcher, not a self-contained copy of OGM. Do not move it
  out of this project folder; the source, node_modules, .next, data and public
  folders stay beside it.
- It starts the OGM server only. It does not install or start Ollama,
  llama.cpp, vLLM, ComfyUI, speech services or a hosted AI account. Choose
  the storyteller in OGM's first-run guided setup.
- .env.server contains the encryption key for the SQLite database. Back it
  up and keep it with data/local-roleplay.sqlite. Losing the key can make
  the encrypted database unreadable.
- The web server binds to all network interfaces on port 3005 so LAN players
  can connect. Only share the address with trusted people.

REBUILD AFTER SOURCE CHANGES
Run Start-OpenGameMaster.exe --rebuild from a terminal in this folder, or
double-click Build-Launcher.cmd to rebuild the launcher binary after editing
Start-OpenGameMaster.cs.
