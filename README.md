![maricom mobile](image.png)
# FEEL THE POWER OF MARI ENCODER
This is a data aggregator and provisioner for the Weatherscan and Domestic IntelliStar systems. It fetches the remote config.py file, extracts the needed locations, packages data for each said locations then uploads it via SFTP to the IntelliStar.

Much like GIT, the name MARI can mean many things, mood permitting:
 - Mari's name. The owner of this software.
 or:
 - LUCKY CHARM DATA ENCODER. If your name is Jaidenism. No further comment.
 - MALICIOUS ALCOHOLIC weatherRANCH INFORMATION ENCODER. If data suddenly breaks on your IntelliStar and you spend the last six hours trying to see what's wrong only to find out that it's this one line of code that only shows up under certain weather that breaks the whole system because the IntelliStar is old and shit and wont accept anything modern.

tyy rai for writing the readme and adding like 50% of the features !!!!!
You're welcome, Mari.

 # Installation
MARI ENCODER uses Node.JS and Python. A relatively new version of Node is recommended for ESM module imports. For Python, Paramiko version 3.5.1 or lower is REQUIRED because newer versions will not negotiate with newer SSH algorithms used on the IntelliStar's FreeBSD installation. Please run the following installation commands in your downloaded directory:

To install dependencies for node:

```npm i```

Then, install dependencies for Python:

``` pip install -r requirements.txt```

Lastly, run the program:

``` npm start ```

# Contributing
This program is still in development. Please make a pull request for any contributions you would like to add.
