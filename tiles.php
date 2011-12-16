<?php

ini_set('memory_limit','128m');

$tileSize = 256;
$maxZoom = 4;
$tilePadding = 10;
$pathToPhotos = './photos/';

$params = array(
	'tileSize' => $_REQUEST['tileSize'],
	'filename' => $_REQUEST['filename'],
	'zoom' => $_REQUEST['zoom'],
	'x' => $_REQUEST['x'],
	'y' => $_REQUEST['y'],
);
if(isset($params['tileSize'])) $tileSize = $params['tileSize'];

$filename = rtrim($pathToPhotos,'/').'/'.str_replace('../','',$params['filename']);


/*
 *
 * Get cache path
 *
 */
$url = substr($_SERVER['REQUEST_URI'],7);
$parts = explode('/',$url);
$partsCount = sizeof($parts);
$path = array();
$file = '';
for($i = 0; $i < $partsCount; $i++) {
	if($i == ($partsCount-1)) $file = $parts[$i];
	else $path[] = $parts[$i];
}


/*
 *
 * Get image infos
 *
 */
$imgsize = getimagesize($filename);
$zoomTiles = array();
$maxTileSize = 0;
$maxSize = $imgsize[1] > $imgsize[0] ? $imgsize[1]:$imgsize[0];
$size = $tileSize;
$step = 1;
while(1) {
	
	$zoomTiles[] = array(
		'step' => $step,
		'size' => $size
	);
	
	//if(($size*2) >= $maxSize) {
	if((sizeof($zoomTiles)-1) >= $maxZoom) {
		$maxTileSize = $size;
		break;
	}
	
	$step = $step *2;
	$size = $size * 2;

}

$zoom = (int)$params['zoom'];
$size = $zoomTiles[$zoom]['size'];
$tiles = $zoomTiles[$zoom]['step'];
$padding = ($tilePadding/100)*$size;


/*
 *
 * Create resized image
 *
 */
$resizedPath = rtrim($pathToPhotos,'/').'/_cache/tiles/resized/'.$size.'/';
$resizedFile = $resizedPath.$file;

if(file_exists($resizedFile)) {
	$resizedOrig = imagecreatefromjpeg($resizedFile);
} else {
	$orig = imagecreatefromjpeg($filename);
	$resizedOrig = imagecreatetruecolor($size,$size);
	imagefill($resizedOrig, 0, 0, imagecolorallocate($resizedOrig, 255, 255, 255));
	
	if($imgsize[0] < $imgsize[1]) {
		$ratio = $imgsize[0]/$imgsize[1];
		$destHeight = $size-($padding*2);
		if($destHeight > $imgsize[1]) $destHeight = $imgsize[1];
		$destWidth = round($destHeight*$ratio);
		$destX = floor(($size/2)-($destWidth/2))+$margin;
		$destY = floor(($size/2)-($destHeight/2));
	} else {
		$ratio = $imgsize[1]/$imgsize[0];
		$destWidth = $size-($padding*2);
		if($destWidth > $imgsize[0]) {
			$destWidth = $imgsize[0];
			$destHeight = $imgsize[1];
		} else {
			$destHeight = round($destWidth*$ratio);
		}
		$destX = floor(($size/2)-($destWidth/2));
		$destY = floor(($size/2)-($destHeight/2));
	}
	
	
	imagecopyresampled($resizedOrig,$orig,$destX,$destY,0,0,$destWidth,$destHeight,$imgsize[0],$imgsize[1]);
	imagedestroy($orig);
	
	/*
	 *
	 * Create cache of resized image
	 *
	 */
	ob_start();
	imagejpeg($resizedOrig,null,100);
	$content = ob_get_clean();
	
	if(!file_exists($resizedPath)) mkdir($resizedPath,0777,true);
	if(file_exists($resizedFile)) unlink($resizedFile);
	file_put_contents($resizedFile,$content);
	
	unset($content);
}


/*
 *
 * Create tile image
 *
 */
$tile = imagecreatetruecolor($tileSize,$tileSize);

$ratio = $maxTileSize/$size;
$x = ($size/$tiles) * (int)$params['x'];
$y = ($size/$tiles) * (int)$params['y'];
if($x < 0) $x = 0;
if($y < 0) $y = 0;

imagecopyresampled($tile,$resizedOrig,0,0,$x,$y,$size,$size,$size,$size);
imagedestroy($resizedOrig); 

/*
 *
 * Get tile content
 *
 */
ob_start();
imagejpeg($tile,null,80);
$content = ob_get_clean();


/*
 *
 * Create cache of tile
 *
 */
$tilePath = rtrim($pathToPhotos,'/').'/_cache/tiles/'.implode('/',$path).'/';
$tileFile = $tilePath.$file;

if(!file_exists($tilePath)) mkdir($tilePath,0777,true);
if(file_exists($tileFile)) unlink($tileFile);
file_put_contents($tileFile,$content);


/*
 *
 * Render image
 *
 */
header('Content-type: image/jpeg');
echo $content;
exit();
