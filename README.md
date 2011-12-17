LUMINEUSE
=========
Display large photos using Google Maps V3

Files
---------

- **lumineuse.js**  
Main class that extends google maps.

- **index.html**  
Example

- **tiles.php**  
PHP script that convert large image into tiles.  
The parameters are :  
tiles.php?zoom=1&x=0&y=1&tileSize=256&filename=1.jpg  

- **.htaccess**   
Rewrite rules to access tiles with better url.   
/tile/256/1/0/1/1.jpg   
/tile/tileSize/zoom/x/y/filename