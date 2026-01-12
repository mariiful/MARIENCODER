import paramiko
import os
import yaml
import argparse
import ntplib
from datetime import datetime, timezone

config = yaml.safe_load(open("config.yaml"))
data_root = os.path.join(os.path.dirname(__file__), "output")

def enumerate_the_loathed_files():
    files = []
    for root, _, filenames in os.walk(data_root):
        for filename in filenames:
            if filename.endswith(".py"):
                files.append(os.path.join(root, filename))
                print(f"Found file to upload: {filename}")
    return files

def runomni_that_white_boy(command: str):
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=config['SFTP']['IP'], username=config['SFTP']['USERNAME'], password=config['SFTP']['PASSWORD'])
    
    full_command = f"su -l dgadmin -c '{command}'"
    print(f"Running: {full_command}")
    
    stdin, stdout, stderr = client.exec_command(full_command)

    output = stdout.read().decode("utf-8", errors="replace")
    error = stderr.read().decode("utf-8", errors="replace")
    
    if output:
        print(output)
    if error:
        print(error)
    
    client.close()

def sync_that_funky_time_white_boy():
    ntpservers = config['SYSTEM']['NTP_SERVERS']
    ntpnow = None
    freebsd_timestamp = None
    
    for server in ntpservers:
        try:
            ntpnow = ntplib.NTPClient().request(host=server)
            print(f"Queried NTP server: {server}")
            freebsd_timestamp = datetime.fromtimestamp(float(ntpnow.tx_time), tz=timezone.utc).strftime("%Y%m%d%H%M.%S")
            print("Syncing your time... Your timestamp is: " + freebsd_timestamp)
            break
        except Exception as e:
            print(f"Failed to query {server}: {e}")
            
    if not ntpnow:
        print("Could not query any NTP server. Syncing time from host clock instead.")
        utcnow = datetime.now(timezone.utc)
        freebsd_timestamp = utcnow.strftime("%Y%m%d%H%M.%S")
        print("Syncing your time... Your timestamp is: " + freebsd_timestamp)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(hostname=config['SFTP']['IP'], username=config['SFTP']['USERNAME'], password=config['SFTP']['PASSWORD'])
        stdin, stdout, stderr = client.exec_command("date -u " + freebsd_timestamp)
        
        output = stdout.read().decode("utf-8", errors="replace")
        error = stderr.read().decode("utf-8", errors="replace")
        
        if output:
            print(output)
        if error:
            print(error)
    except Exception as e:
        print(f"SSH Connection failed: {e}")
    finally:
        client.close()

def sftp_upload(product: str):
    image_root = os.path.join(os.path.dirname(__file__), "radar")

    sftp_config = config['SFTP']
    transport = paramiko.Transport((sftp_config['IP'], sftp_config['PORT']))
    transport.connect(username=sftp_config['USERNAME'], password=sftp_config['PASSWORD'])
    sftp = paramiko.SFTPClient.from_transport(transport)

    if product == "radar" or product == "all":
        import subprocess
        py_launcher = "py" if os.name == "nt" else "python3"

        subprocess.run([py_launcher, os.path.join(os.path.dirname(__file__), "radar.py")])

        with os.scandir(image_root) as f:
                for entry in f:
                    if entry.is_file():
                        local_image_path = entry.path
                        remote_image_path = os.path.join("/twc/data/volatile/images/radar/us/", entry.name)
                        try:
                            sftp.stat("/twc/data/volatile/images/radar/us/")
                        except FileNotFoundError:
                            sftp.mkdir("/twc/data/volatile/images/radar/us/")
                        sftp.put(local_image_path, remote_image_path)
                        print(f"Uploaded image {local_image_path} to {remote_image_path}")
    if product == "text_data" or product == "all":
        for file_path in enumerate_the_loathed_files():
            remote_path = os.path.join("/home/dgadmin/", os.path.relpath(file_path, data_root))
            remote_dir = os.path.dirname(remote_path)
            try:
                sftp.stat(remote_dir)
            except FileNotFoundError:
                sftp.mkdir(remote_dir)
            sftp.put(file_path, remote_path)
            print(f"Uploaded {file_path} to {remote_path}")
            runomni_that_white_boy(f"runomni /twc/util/loadSCMTconfig.pyc {remote_path}")
    
    sftp.close()
    transport.close()
    

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--job', action='store', help="Run a specific job. Available jobs: data, timesync", default="data")
    args = parser.parse_args()
    if args.job == "data":
        sftp_upload("text_data")
    if args.job == "timesync":
        sync_that_funky_time_white_boy()
    if args.job == "radar":
        sftp_upload("radar")
    if args.job == "all":
        sync_that_funky_time_white_boy()
        sftp_upload("all")

    else:
        sftp_upload("all")