using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

internal static class Program
{
    private const int Port = 3005;
    private const string BaseUrl = "http://127.0.0.1:3005";
    private static readonly object ConsoleLock = new object();
    private static Process Server;
    private static string SetupUrl = "";

    private static int Main(string[] args)
    {
        Console.OutputEncoding = Encoding.UTF8;
        Console.Title = "Open Game Master";
        string root = AppDomain.CurrentDomain.BaseDirectory;
        bool rebuild = Array.IndexOf(args, "--rebuild") >= 0;

        try
        {
            Console.WriteLine("Open Game Master 0.33.0 — Windows launcher");
            Console.WriteLine("Project: " + root);
            Console.WriteLine();

            if (!File.Exists(Path.Combine(root, "package.json")) ||
                !Directory.Exists(Path.Combine(root, "src")))
            {
                return Fail("Пускатель должен лежать в корневой папке проекта OGM.");
            }

            string node = FindOnPath("node.exe");
            if (String.IsNullOrEmpty(node))
                return Fail("Node.js не найден. Установите Node.js 22.18+, 24 или 26+, затем запустите EXE снова.");

            string npm = Path.Combine(Path.GetDirectoryName(node), "npm.cmd");
            if (!File.Exists(npm)) npm = FindOnPath("npm.cmd");
            if (String.IsNullOrEmpty(npm) || !File.Exists(npm))
                return Fail("Не найден npm.cmd рядом с Node.js. Переустановите Node.js с npm.");

            if (!CheckNodeVersion(node))
                return Fail("Версия Node.js не подходит. Нужна 22.18+, 24 или 26+.");

            if (!File.Exists(Path.Combine(root, "node_modules", "next", "dist", "bin", "next")))
                return Fail("Не найдены зависимости проекта (node_modules). Сначала выполните npm install в папке OGM.");

            if (IsPortOpen(Port))
            {
                if (IsHealthy())
                {
                    Console.WriteLine("OGM уже запущен на порту " + Port + ". Открываю браузер.");
                    OpenBrowser(BaseUrl);
                    return 0;
                }
                return Fail("Порт 3005 уже занят другим приложением. Закройте его или освободите порт.");
            }

            if (rebuild || NeedsSetup(root))
            {
                Console.WriteLine(rebuild
                    ? "Запрошена повторная подготовка и пересборка."
                    : "Первый запуск: подготавливаю OGM.");
                Console.WriteLine("Будут проверены ключ БД, контентный пакет, модель памяти и production-сборка.");
                Console.WriteLine("Ключ шифрования будет сохранён в .env.server. Не удаляйте и не теряйте этот файл.");
                Console.WriteLine();

                if (!RunSetup(npm, root))
                    return Fail("Подготовка не завершилась. Исправьте указанную выше ошибку и запустите EXE снова.");
            }

            return StartServer(node, root);
        }
        catch (Exception ex)
        {
            return Fail("Непредвиденная ошибка: " + ex.Message);
        }
    }

    private static int Fail(string message)
    {
        Console.WriteLine();
        Console.WriteLine("[ОШИБКА] " + message);
        Console.WriteLine("Нажмите Enter, чтобы закрыть окно.");
        Console.ReadLine();
        return 1;
    }

    private static string FindOnPath(string name)
    {
        string path = Environment.GetEnvironmentVariable("PATH") ?? "";
        foreach (string folder in path.Split(';'))
        {
            string dir = folder.Trim().Trim('"');
            if (dir.Length == 0) continue;
            string candidate = Path.Combine(dir, name);
            if (File.Exists(candidate)) return candidate;
        }
        return null;
    }

    private static bool CheckNodeVersion(string node)
    {
        ProcessStartInfo info = new ProcessStartInfo(node, "--version");
        info.UseShellExecute = false;
        info.RedirectStandardOutput = true;
        info.CreateNoWindow = true;
        using (Process p = Process.Start(info))
        {
            string value = p.StandardOutput.ReadToEnd().Trim().TrimStart('v');
            p.WaitForExit(10000);
            string[] parts = value.Split('.');
            int major, minor = 0;
            if (parts.Length == 0 || !Int32.TryParse(parts[0], out major)) return false;
            if (parts.Length > 1) Int32.TryParse(parts[1], out minor);
            bool supported = (major == 22 && minor >= 18) || major == 24 || major >= 26;
            Console.WriteLine("Node.js: " + value + (supported ? " (подходит)" : " (неподдерживаемая версия)"));
            return supported && p.ExitCode == 0;
        }
    }

    private static bool NeedsSetup(string root)
    {
        string envPath = Path.Combine(root, ".env.server");
        bool hasKey = false;
        if (File.Exists(envPath))
        {
            string env = File.ReadAllText(envPath);
            hasKey = Regex.IsMatch(env, @"(?m)^\s*DB_ENCRYPTION_KEY\s*=\s*\S+");
        }
        bool hasPack = File.Exists(Path.Combine(root, "data", "content", "open5e.sqlite"));
        bool hasBuild = File.Exists(Path.Combine(root, ".next", "BUILD_ID"));
        return !hasKey || !hasPack || !hasBuild;
    }

    private static bool RunSetup(string npm, string root)
    {
        string comspec = Environment.GetEnvironmentVariable("ComSpec");
        if (String.IsNullOrEmpty(comspec)) comspec = "cmd.exe";
        ProcessStartInfo info = new ProcessStartInfo();
        info.FileName = comspec;
        info.Arguments = "/d /c npm.cmd run setup";
        info.WorkingDirectory = root;
        info.UseShellExecute = false;
        info.CreateNoWindow = false;
        using (Process p = Process.Start(info))
        {
            p.WaitForExit();
            Console.WriteLine();
            Console.WriteLine("Подготовка завершилась с кодом " + p.ExitCode + ".");
            return p.ExitCode == 0;
        }
    }

    private static int StartServer(string node, string root)
    {
        Console.WriteLine();
        Console.WriteLine("Запускаю production-сервер OGM на порту " + Port + "...");
        ProcessStartInfo info = new ProcessStartInfo();
        info.FileName = node;
        info.Arguments = "node_modules\\next\\dist\\bin\\next start -H 0.0.0.0 -p " + Port;
        info.WorkingDirectory = root;
        info.UseShellExecute = false;
        info.CreateNoWindow = true;
        info.RedirectStandardOutput = true;
        info.RedirectStandardError = true;
        info.EnvironmentVariables["PORT"] = Port.ToString();
        info.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";

        Server = new Process();
        Server.StartInfo = info;
        Server.EnableRaisingEvents = true;
        Server.OutputDataReceived += OnServerLine;
        Server.ErrorDataReceived += OnServerLine;
        Server.Start();
        Server.BeginOutputReadLine();
        Server.BeginErrorReadLine();

        Console.CancelKeyPress += delegate(object sender, ConsoleCancelEventArgs e)
        {
            e.Cancel = true;
            StopServer();
        };

        bool ready = false;
        for (int i = 0; i < 120; i++)
        {
            if (Server.HasExited)
                return Fail("Сервер завершился во время запуска. Проверьте сообщения выше.");

            if (IsHealthy())
            {
                ready = true;
                break;
            }
            Thread.Sleep(1000);
        }

        if (!ready)
        {
            StopServer();
            return Fail("Сервер не ответил за 120 секунд. Проверьте вывод выше.");
        }

        Thread.Sleep(500); // Let the asynchronous startup-log reader capture the setup link.
        string url = SetupUrl;
        if (String.IsNullOrEmpty(url)) url = BaseUrl;
        Console.WriteLine();
        Console.WriteLine("OGM запущен: " + BaseUrl);
        Console.WriteLine("Открываю браузер: " + url);
        if (String.IsNullOrEmpty(SetupUrl))
            Console.WriteLine("Если это первый запуск, одноразовый код администратора показан выше в журнале сервера.");
        Console.WriteLine();
        Console.WriteLine("Сервер работает. Не закрывайте это окно.");
        Console.WriteLine("Для остановки нажмите Ctrl+C.");
        OpenBrowser(url);

        Server.WaitForExit();
        Console.WriteLine("Сервер остановлен (код " + Server.ExitCode + ").");
        return Server.ExitCode;
    }

    private static void OnServerLine(object sender, DataReceivedEventArgs e)
    {
        if (e.Data == null) return;
        lock (ConsoleLock) Console.WriteLine(e.Data);

        Match match = Regex.Match(e.Data, @"http://localhost:" + Port + @"/\S*setup=\S*");
        if (match.Success)
        {
            lock (ConsoleLock) SetupUrl = match.Value.TrimEnd('.', ',', ')', ']');
        }
    }

    private static bool IsPortOpen(int port)
    {
        try
        {
            using (TcpClient client = new TcpClient())
            {
                IAsyncResult result = client.BeginConnect("127.0.0.1", port, null, null);
                bool connected = result.AsyncWaitHandle.WaitOne(250);
                if (!connected) return false;
                client.EndConnect(result);
                return true;
            }
        }
        catch { return false; }
    }

    private static bool IsHealthy()
    {
        try
        {
            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(BaseUrl + "/api/health");
            request.Method = "GET";
            request.Timeout = 1200;
            request.ReadWriteTimeout = 1200;
            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            {
                return (int)response.StatusCode >= 200 && (int)response.StatusCode < 300;
            }
        }
        catch { return false; }
    }

    private static void OpenBrowser(string url)
    {
        try
        {
            ProcessStartInfo info = new ProcessStartInfo(url);
            info.UseShellExecute = true;
            Process.Start(info);
        }
        catch (Exception ex)
        {
            Console.WriteLine("Не удалось автоматически открыть браузер: " + ex.Message);
            Console.WriteLine("Откройте вручную: " + url);
        }
    }

    private static void StopServer()
    {
        try
        {
            if (Server != null && !Server.HasExited)
            {
                Console.WriteLine();
                Console.WriteLine("Останавливаю OGM...");
                Server.Kill();
                Server.WaitForExit(5000);
            }
        }
        catch { }
    }
}
