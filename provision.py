import paramiko
import os
import yaml
import time
from datetime import datetime

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
    now = datetime.now()
    freebsd_timestamp = now.strftime("%m%d%H%M%Y.%S") # Generate current FreeBSD timestamp
    print("Syncing your time... Your timestamp is: " + freebsd_timestamp)
    
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=config['SFTP']['IP'], username=config['SFTP']['USERNAME'], password=config['SFTP']['PASSWORD'])
    
    stdin, stdout, stderr = client.exec_command("date " + freebsd_timestamp) # Sync the time of the VM
    
    output = stdout.read().decode("utf-8", errors="replace")
    error = stderr.read().decode("utf-8", errors="replace")
    
    if output:
        print(output)
    if error:
        print(error)
        
    client.close()

def sftp_upload():
    sync_that_funky_time_white_boy()
    sftp_config = config['SFTP']
    transport = paramiko.Transport((sftp_config['IP'], sftp_config['PORT']))
    transport.connect(username=sftp_config['USERNAME'], password=sftp_config['PASSWORD'])
    sftp = paramiko.SFTPClient.from_transport(transport)

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
    sftp_upload()
