import collections
from genericpath import exists
import gzip
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import time as epochTime
import requests
import logging,coloredlogs
import shutil
import yaml
from datetime import datetime, timezone
import numpy as np
import math

from os import path, mkdir, listdir, remove, cpu_count
import os
from shutil import rmtree
from PIL import Image as PILImage

with open("config.yaml", 'r') as f:
    config = yaml.safe_load(f)
    api_key = config['API']['WEATHER_API_KEY']

radarType = "Radar-US"

OUTPUT_DIR = "radar/"

l = logging.getLogger(__name__)
coloredlogs.install(config['SYSTEM']['COLOREDLOGS_JSON'])

upperLeftX,upperLeftY,lowerRightX,lowerRightY = 0,0,0,0
xStart,xEnd,yStart,yEnd = 0,0,0,0
imgW = 0
imgH = 0

import sys
sys.path.append("./py2lib")
sys.path.append("./radar")

# UTIL SHIT
class Point():
    def __init__(self, x, y):
        self.x = x
        self.y = y

class LatLong():
    def __init__(self, x, y):
        self.x = x
        self.y = y

class ImageBoundaries():
    def __init__(self, LowerLeftLong,LowerLeftLat,UpperRightLong,UpperRightLat,VerticalAdjustment,OGImgW,OGImgH,ImagesInterval,Expiration):
        self.LowerLeftLong = LowerLeftLong
        self.LowerLeftLat = LowerLeftLat
        self.UpperRightLong = UpperRightLong
        self.UpperRightLat = UpperRightLat

        self.VerticalAdjustment = VerticalAdjustment

        self.OGImgW = OGImgW
        self.OGImgH = OGImgH
        self.ImageInterval = ImagesInterval
        self.Expiration = Expiration

    def GetUpperRight(self) -> LatLong:
        return LatLong(
            x = self.UpperRightLat,
            y = self.UpperRightLong
        )

    def GetLowerLeft(self) -> LatLong:
        return LatLong(
            x = self.LowerLeftLat,
            y = self.LowerLeftLong
        )

    def GetUpperLeft(self) -> LatLong:
        return LatLong(
            x = self.UpperRightLat, y = self.LowerLeftLong
        )

    def GetLowerRight(self) -> LatLong:
        return LatLong(
            x = self.LowerLeftLat, y = self.UpperRightLong
        )
   
def WorldCoordinateToTile(coord: Point) -> Point:
    scale = 1 << 6

    return Point(
        x = math.floor(coord.x * scale / 256),
        y = math.floor(coord.y * scale / 256)
    )

def WorldCoordinateToPixel(coord: Point) -> Point:
    scale = 1 << 6

    return Point(
        x = math.floor(coord.x * scale),
        y = math.floor(coord.y * scale) 
    )

def LatLongProject(lat, long) -> Point:
    siny = math.sin(lat * math.pi / 180)
    siny = min(max(siny, -0.9999), 0.9999)

    return Point(
        x = 256 * (0.5 + long / 360),
        y = 256 * (0.5 - math.log((1 + siny) / (1 - siny)) / (4 * math.pi))
    )

def getValidTimestamps(boundaries:ImageBoundaries) -> list:

    l.info("Getting timestamps for the radar..")
    times = []

    url = f"https://api.weather.com/v3/TileServer/series/productSet?apiKey={api_key}&filter=twcRadarMosaic"
    response = requests.get(url).json()

    for t in range(0, len(response['seriesInfo']['twcRadarMosaic']['series'])):

        if (t <= 35):
            time = response['seriesInfo']['twcRadarMosaic']['series'][t]['ts']
            
            # Don't add frames that aren't at the correct interval
            if (time % boundaries.ImageInterval != 0):
                l.debug(f"Ignoring {time} -- Not at the correct frame interval.")
                continue

            # Don't add frames that are expired
            if (time < (datetime.now(timezone.utc).timestamp() - epochTime.time()) / 1000 - boundaries.Expiration):
                l.debug(f"Ignoring {time} -- Expired.")
                continue

            times.append(time)

    return times

def getLatestRadarTimestamp(boundaries:ImageBoundaries) -> int:

    l.info("Getting latest timestamp for radar update..")

    url = f"https://api.weather.com/v3/TileServer/series/productSet?apiKey={api_key}&filter=twcRadarMosaic"
    response = requests.get(url).json()

    if len(response['seriesInfo']['twcRadarMosaic']['series']) > 0:
        latest_time = response['seriesInfo']['twcRadarMosaic']['series'][0]['ts']
        
        if (latest_time % boundaries.ImageInterval != 0):
            l.debug(f"Latest timestamp {latest_time} not at correct interval.")
            return None

        if (latest_time < (datetime.now(timezone.utc).timestamp() - epochTime.time()) / 1000 - boundaries.Expiration):
            l.debug(f"Latest timestamp {latest_time} is expired.")
            return None

        return latest_time
    
    return None

def downloadRadarTile(url, p, fn):
    img = requests.get(url, stream=True)
    ts = fn.split("_")[0]
    download = True
    
    if not path.exists(p):
        os.makedirs(p, exist_ok=True)
        l.debug(f"Download {ts}")
        
    if exists(f"{p}/{fn}"): 
        l.debug(f"Not downloading new tiles for {ts} as they already exist.")
        download = False

    if (img.status_code == 200 and download):
        with open(f'{p}/{fn}', 'wb') as tile:
            for data in img:
                tile.write(data)
    elif (img.status_code != 200):
        l.error("ERROR DOWNLOADING " + p + "\nSTATUS CODE " + str(img.status_code))
    elif (download == False):
        pass

def getImageBoundaries() -> ImageBoundaries:
    seqDef = {
        "Radar-US": {
            "LowerLeftLong": -126.834935,
            "LowerLeftLat": 22.197152,
            "UpperRightLong": -65.178922,
            "UpperRightLat": 55.5894,
            "VerticalAdjustment": 1.1985928,
            "OriginalImageWidth": 4096,
            "OriginalImageHeight": 2460,
            "MaxImages": 36,
            "Gap": 4,
            "ImagesInterval": 300,
            "Expiration": 10800,
            "DeletePadding": 1800,
            "FileNameDateFormat": "yyyyMMddHHmm"
        },

		"SatRad-US": {
            "LowerLeftLong": -132.960807,
            "LowerLeftLat": 20.170198,
            "UpperRightLong": -56.707770,
            "UpperRightLat": 53.410859,
            "VerticalAdjustment": 1.0,
            "OriginalImageWidth": 1920,
            "OriginalImageHeight": 1080,
            "MaxImages": 16,
            "Gap": 4,
            "ImagesInterval": 90,
            "Expiration": 10800,
            "DeletePadding": 1800,
            "FileNameDateFormat": "yyyyMMddHHmm"
        },

        "Radar-PR": {
            "LowerLeftLong": -162.633484,
            "LowerLeftLat": 16.569253,
            "UpperRightLong": -151.702146,
            "UpperRightLat": 24.773036,
            "VerticalAdjustment": 1.199,
            "OriginalImageWidth": 1300,
            "OriginalImageHeight": 600,
            "MaxImages": 12,
            "Gap": 4,
            "ImagesInterval": 900,
            "Expiration": 10800,
            "DeletePadding": 1800,
            "FileNameDateFormat": "yyyyMMddHHmm"
        },

        "Radar-HI": {
            "LowerLeftLong": -73.427336,
            "LowerLeftLat": 14.558724,
            "UpperRightLong": -59.620365,
            "UpperRightLat": 21.826707,
            "VerticalAdjustment": 1.1985928,
            "OriginalImageWidth": 1500,
            "OriginalImageHeight": 1500,
            "MaxImages": 36,
            "Gap": 4,
            "ImagesInterval": 300,
            "Expiration": 10800,
            "DeletePadding": 1800,
            "FileNameDateFormat": "yyyyMMddHHmm"
        },

        "Radar-AK": {
            "LowerLeftLong": -178.505920,
            "LowerLeftLat": 51.379081,
            "UpperRightLong": -124.517227,
            "UpperRightLat": 71.504753,
            "VerticalAdjustment": 1.0175897,
            "OriginalImageWidth": 2000,
            "OriginalImageHeight": 1600,
            "MaxImages": 36,
            "Gap": 4,
            "ImagesInterval": 300,
            "Expiration": 10800,
            "DeletePadding": 1800,
            "FileNameDateFormat": "yyyyMMddHHmm"
        }
    }

    selected = seqDef[radarType]
    return ImageBoundaries(
        LowerLeftLong = selected['LowerLeftLong'],
        LowerLeftLat= selected['LowerLeftLat'],
        UpperRightLong= selected['UpperRightLong'],
        UpperRightLat= selected['UpperRightLat'],
        VerticalAdjustment= selected['VerticalAdjustment'],
        OGImgW= selected['OriginalImageWidth'],
        OGImgH= selected['OriginalImageHeight'],
        ImagesInterval= selected['ImagesInterval'],
        Expiration= selected['Expiration']
    )

def CalculateBounds(upperRight:LatLong, lowerLeft:LatLong, upperLeft:LatLong, lowerRight: LatLong):
    upperRightTile:Point = WorldCoordinateToTile(LatLongProject(upperRight.x, upperRight.y))
    lowerLeftTile:Point = WorldCoordinateToTile(LatLongProject(lowerLeft.x, lowerLeft.y))
    upperLeftTile:Point = WorldCoordinateToTile(LatLongProject(upperLeft.x, upperLeft.y))
    lowerRightTile:Point = WorldCoordinateToTile(LatLongProject(lowerRight.x,lowerRight.y))

    upperLeftPx:Point = WorldCoordinateToPixel(LatLongProject(upperLeft.x, upperLeft.y))
    lowerRightPx:Point = WorldCoordinateToPixel(LatLongProject(lowerRight.x,lowerRight.y))

    global upperLeftX,upperLeftY,lowerRightX,lowerRightY
    global xStart,xEnd,yStart,yEnd
    global imgW,imgH

    upperLeftX = upperLeftPx.x - upperLeftTile.x * 256
    upperLeftY = upperLeftPx.y - upperLeftTile.y * 256
    lowerRightX = lowerRightPx.x - upperLeftTile.x * 256
    lowerRightY = lowerRightPx.y - upperLeftTile.y * 256

    xStart = int(upperLeftTile.x)
    xEnd = int(upperRightTile.x)
    yStart = int(upperLeftTile.y)
    yEnd = int(lowerLeftTile.y)

    xTiles:int = xEnd - xStart
    yTiles:int = yEnd - yStart

    imgW = 256 * (xTiles + 1)
    imgH = 256 * (yTiles + 1)

COLOR_MAP = {
    # Rain colors
    (99 << 16) | (235 << 8) | 99: (64, 204, 85),    # lightest green
    (28 << 16) | (158 << 8) | 52: (0, 153, 0),      # med green
    (0 << 16) | (63 << 8) | 0: (0, 102, 0),         # darkest green
    (251 << 16) | (235 << 8) | 2: (191, 204, 85),   # yellow
    (238 << 16) | (109 << 8) | 2: (191, 153, 0),    # orange
    (210 << 16) | (11 << 8) | 6: (255, 51, 0),      # red-orange
    (169 << 16) | (5 << 8) | 3: (191, 51, 0),       # red
    (128 << 16) | (0 << 8) | 0: (64, 0, 0),         # dark red
    # Mix colors
    (255 << 16) | (160 << 8) | 207: (253, 130, 215),  # light purple
    (217 << 16) | (110 << 8) | 163: (208, 94, 176),
    (192 << 16) | (77 << 8) | 134: (190, 70, 150),
    (174 << 16) | (51 << 8) | 112: (170, 50, 130),    # dark purple
    (146 << 16) | (13 << 8) | 79: (170, 50, 130),
    # Snow colors
    (138 << 16) | (248 << 8) | 255: (150, 150, 150),  # dark grey
    (110 << 16) | (203 << 8) | 212: (180, 180, 180),  # light grey
    (82 << 16) | (159 << 8) | 170: (210, 210, 210),   # grey
    (40 << 16) | (93 << 8) | 106: (230, 230, 230),    # white
    (13 << 16) | (49 << 8) | 64: (230, 230, 230),
}

def convertPaletteToWXPro(filepath: str):
    # how was the old version slow as hell on a ryzen 5 7600x??
    img = PILImage.open(filepath).convert('RGB')
    data = np.array(img, dtype=np.uint32)
    packed = (data[:,:,0] << 16) | (data[:,:,1] << 8) | data[:,:,2]
    for old_packed, new_color in COLOR_MAP.items():
        mask = packed == old_packed
        data[mask] = new_color
    result = PILImage.fromarray(data[:,:,:3].astype(np.uint8))
    result.save(filepath, compression='tiff_lzw')

def getTime(timestamp) -> str:
    time:datetime = datetime.fromtimestamp(timestamp, tz=timezone.utc).strftime("%m/%d/%Y %H:%M:%S")
        
    return str(time)

def makeRadarImages():
    """ Creates proper radar frames for the i2 """
    l.info("Downloading frames for the Regional Radar...")
    
    combinedCoordinates = []

    boundaries = getImageBoundaries()
    upperRight:LatLong = boundaries.GetUpperRight()
    lowerLeft:LatLong = boundaries.GetLowerLeft()
    upperLeft:LatLong = boundaries.GetUpperLeft()
    lowerRight:LatLong = boundaries.GetLowerRight()

    CalculateBounds(upperRight, lowerLeft, upperLeft, lowerRight)
    times = getValidTimestamps(boundaries)

    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)
    
    valid_timestamps = set(str(x) for x in times)
    for filename in listdir(OUTPUT_DIR):
        if filename == "Thumbs.db":
            continue
        timestamp = filename.split('.')[0]
        if timestamp not in valid_timestamps:
            l.debug(f"Deleting {filename} as it is no longer valid.")
            remove(os.path.join(OUTPUT_DIR, filename))
    
    for y in range(yStart, yEnd):
        if y <= yEnd:
            for x in range(xStart, xEnd):
                if x <= xEnd:
                    combinedCoordinates.append(Point(x,y))

    urls = []
    paths = []
    filenames = []
    for i in range(0, len(times)):
        issue_time = times[i]
        three_hours_later_time = issue_time + (3 * 60 * 60)
        new_filename = f"{issue_time}.{three_hours_later_time}.tif"
        full_path = f"{OUTPUT_DIR}{new_filename}"
        
        if not exists(full_path):
            for c in range(0, len(combinedCoordinates)):
                urls.append(f"https://api.weather.com/v3/TileServer/tile?product=twcRadarMosaic&ts={str(times[i])}&xyz={combinedCoordinates[c].x}:{combinedCoordinates[c].y}:6&apiKey={api_key}")
                paths.append(f"./.temp/tiles/{times[i]}")
                filenames.append(f"{times[i]}_{combinedCoordinates[c].x}_{combinedCoordinates[c].y}.png")

    l.debug(len(urls))
    if len(urls) == 0:
        l.info("No new radar frames need to be downloaded.")
        return

    max_workers = min(len(urls), cpu_count() * 4)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(downloadRadarTile, url, p, fn) 
                   for url, p, fn in zip(urls, paths, filenames)]
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                l.error(f"Download failed: {e}")

    imgsToGenerate = []
    framesToComposite = []
    finished = []
    files = []

    for t in times:
        imgsToGenerate.append(PILImage.new("RGB", (imgW, imgH)))

    for i in range(0, len(imgsToGenerate)):
        issue_time = times[i]
        three_hours_later_time = issue_time + (3 * 60 * 60)
        new_filename = f"{issue_time}.{three_hours_later_time}.tif"
        full_path = f"{OUTPUT_DIR}{new_filename}"
        
        tile_dir = f'./.temp/tiles/{times[i]}'
        
        if exists(tile_dir):
            l.debug(f"Generate frame for {times[i]}")
            for c in combinedCoordinates:
                tile_path = f"{tile_dir}/{times[i]}_{c.x}_{c.y}.png"

                xPlacement = (c.x - xStart) * 256
                yPlacement = (c.y - yStart) * 256

                placeTile = PILImage.open(tile_path)

                imgsToGenerate[i].paste(placeTile, (xPlacement, yPlacement))

            imgsToGenerate[i].save(full_path, compression = 'tiff_lzw')
            framesToComposite.append(full_path)
            rmtree(tile_dir)

    imgsProcessed = 0 
    for img in framesToComposite:
        imgsProcessed += 1
        l.debug("Attempting to composite " + img)
        l.info(f"Processing radar frame {imgsProcessed} / 36")

        imgPIL = PILImage.open(img)
        imgPIL = imgPIL.crop((upperLeftX, upperLeftY, lowerRightX, lowerRightY))
        imgPIL = imgPIL.resize((boundaries.OGImgW, boundaries.OGImgH), PILImage.LANCZOS)
        imgPIL.save(img, compression='tiff_lzw')

        convertPaletteToWXPro(img)

        finished.append(img)

    shutil.rmtree("./.temp/")
    return

def makeLatestRadarImage():
    """ Creates the latest radar frame for continuous updates """
    l.info("Downloading latest radar frame for update...")
    
    boundaries = getImageBoundaries()
    latest_time = getLatestRadarTimestamp(boundaries)
    
    if latest_time is None:
        l.info("No new radar frame available for update.")
        return

    issue_time = latest_time
    three_hours_later_time = issue_time + (3 * 60 * 60)
    new_filename = f"{issue_time}.{three_hours_later_time}.tif"
    full_path = f"{OUTPUT_DIR}{new_filename}"
    
    if exists(full_path):
        l.info(f"Latest radar frame {latest_time} already exists, skipping.")
        return
        
    combinedCoordinates = []
    
    upperRight:LatLong = boundaries.GetUpperRight()
    lowerLeft:LatLong = boundaries.GetLowerLeft()
    upperLeft:LatLong = boundaries.GetUpperLeft()
    lowerRight:LatLong = boundaries.GetLowerRight()

    CalculateBounds(upperRight, lowerLeft, upperLeft, lowerRight)
    
    for y in range(yStart, yEnd):
        if y <= yEnd:
            for x in range(xStart, xEnd):
                if x <= xEnd:
                    combinedCoordinates.append(Point(x,y))

    urls = []
    paths = []
    filenames = []
    
    for c in range(0, len(combinedCoordinates)):
        urls.append(f"https://api.weather.com/v3/TileServer/tile?product=twcRadarMosaic&ts={str(latest_time)}&xyz={combinedCoordinates[c].x}:{combinedCoordinates[c].y}:6&apiKey={api_key}")
        paths.append(f"./.temp/tiles/{latest_time}")
        filenames.append(f"{latest_time}_{combinedCoordinates[c].x}_{combinedCoordinates[c].y}.png")

    l.debug(f"Downloading {len(urls)} tiles for latest frame")
    if len(urls) == 0:
        l.info("No tiles to download for latest frame.")
        return

    max_workers = min(len(urls), cpu_count() * 4)
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = [executor.submit(downloadRadarTile, url, p, fn) 
                   for url, p, fn in zip(urls, paths, filenames)]
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                l.error(f"Download failed: {e}")

    latest_img = PILImage.new("RGB", (imgW, imgH))
    tile_dir = f'./.temp/tiles/{latest_time}'
    
    if exists(tile_dir):
        l.debug(f"Generating latest frame for {latest_time}")
        for c in combinedCoordinates:
            tile_path = f"{tile_dir}/{latest_time}_{c.x}_{c.y}.png"

            xPlacement = (c.x - xStart) * 256
            yPlacement = (c.y - yStart) * 256

            placeTile = PILImage.open(tile_path)
            latest_img.paste(placeTile, (xPlacement, yPlacement))
        
        latest_img.save(full_path, compression = 'tiff_lzw')
        rmtree(tile_dir)
        l.info("Processing latest radar frame")
        imgPIL = PILImage.open(full_path)
        imgPIL = imgPIL.crop((upperLeftX, upperLeftY, lowerRightX, lowerRightY))
        imgPIL = imgPIL.resize((boundaries.OGImgW, boundaries.OGImgH), PILImage.LANCZOS)
        imgPIL.save(full_path, compression='tiff_lzw')

        convertPaletteToWXPro(full_path)
        
        l.info(f"Latest radar frame {latest_time} processed successfully")
    
    if exists("./.temp/"):
        shutil.rmtree("./.temp/")

def gen_radarload_files():
    input_dir = "radar"
    radar_files = sorted([f for f in os.listdir(input_dir) if f.lower().endswith(".tif")])
    
    if not radar_files:
        l.info("No radar files found to generate radarload.py")
        return
    
    outpath = os.path.join('output', "radarload.py")
    with open(outpath, "w") as f:
        for filename in radar_files:
            f.write(
                f"wxdata.setImageData('radar.us', '/twc/data/volatile/images/radar/us/{filename}')\n"
            )
    
    l.info(f"Generated radarload.py with {len(radar_files)} radar frames")

if __name__ == "__main__":
    makeRadarImages()
    gen_radarload_files()