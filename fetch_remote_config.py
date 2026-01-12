import paramiko
import os
import yaml
import re
import json
import logging
import coloredlogs

config = yaml.safe_load(open("config.yaml"))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
coloredlogs.install(config['SYSTEM']['COLOREDLOGS_JSON'])

remote_root = "./remote"
remote_config = "/home/dgadmin/config/current/config.py"

def fetch_remote_config():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(hostname=config['SFTP']['IP'], username=config['SFTP']['USERNAME'], password=config['SFTP']['PASSWORD'])
    
    sftp = client.open_sftp()
    local_path = os.path.join(remote_root, "config.py")
    os.makedirs(remote_root, exist_ok=True)
    sftp.get(remote_config, local_path)
    logger.info(f"Fetched remote config to {local_path}")
    
    sftp.close()
    client.close()

def compile_remote_interest_list():
    local_config_path = os.path.join(remote_root, "config.py")
    with open(local_config_path, "r") as f:
        content = f.read()
    
    pattern = r"wxdata\.setInterestList\('(\w+)',\s*'[^']*',\s*\[([^\]]*)\]\)"
    
    interest_lists = {}
    
    for match in re.finditer(pattern, content):
        list_type = match.group(1)
        items_str = match.group(2)
        
        items = re.findall(r"'([^']*)'", items_str)
        
        if items:
            interest_lists[list_type] = items
    
    output_path = os.path.join(remote_root, "interest_lists.json")
    with open(output_path, "w") as f:
        json.dump(interest_lists, f, indent=2)
    
    logger.info(f"Saved interest lists to {output_path}")
    return interest_lists

if __name__ == "__main__":
    fetch_remote_config()
    logger.info("Remote configuration fetched successfully.")
    interest_lists = compile_remote_interest_list()
    logger.info("\nExtracted interest lists:")
    logger.info(f"  coopId: {interest_lists.get('coopId', [])}")
    logger.info(f"  obsStation: {interest_lists.get('obsStation', [])}")