/**
 * A simple WebRTC P.O.C.
 * 
 * When you click "Start", you will see an image.
 * You have to reproduice it to win or
 * you can simply made a free picture.
 * 
 * The aim of this code is not to have a valid fully
 * finalized game but more to show how easy it could
 * be to use WebRTC.
 * 
 * It's pretty quick and dirty, do not reuse as it is...
 * 
 * @author : J-Et. MARTIN | http://www.jet-martin.com
 */

/**
 * WebRTC script file.
 */
var webrtc = (function() {
	/*
	 * Global variables.
	 */
    var getVideo       = true,

        video          = document.getElementById('webcam'),
        feed           = document.getElementById('feed'),
        feedContext    = feed.getContext('2d'),
        display        = document.getElementById('display'),
        displayContext = display.getContext('2d'),
        
        colorToPrint = new Array(0,0,0,255),
        colorToSelect = new Array(255,0,0,255),
		
		compare        = false,
		seuil          = 85,
		print          = false,
		durete         = 100,
		fusion         = false,
		fusionSeuil    = 10, // Must be >= 2
		effect         = 'colorDetect',
		resultValue    = null;

    navigator.getUserMedia ||
        (navigator.getUserMedia = navigator.mozGetUserMedia ||
        navigator.webkitGetUserMedia || navigator.msGetUserMedia);

    window.requestAnimationFrame ||
        (window.requestAnimationFrame = window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame || 
            window.oRequestAnimationFrame || 
            window.msRequestAnimationFrame || 
            function( callback ){
                window.setTimeout(callback, 1000 / 60);
            });
	/*
	 * Stream connector.
	 */
    function requestStreams() {
        if (navigator.getUserMedia) {
            navigator.getUserMedia({
                video: getVideo
            }, onSuccess, onError);
        } else {
            alert('getUserMedia is not supported in this browser.');
        }
    }
    /*
     * Init. the WebRTC.
     */
    function onSuccess(stream) {
        var videoSource,
            mediaStreamSource;

        if (getVideo) {
            if (window.webkitURL) {
                videoSource = window.webkitURL.createObjectURL(stream);
            } else {
                videoSource = stream;
            }

            video.autoplay = true;
            video.src = videoSource;

            display.width = feed.width = 320;
            display.height = feed.height = 240;

            streamFeed();
        }
    }
	/*
	 * Stream connection error.
	 */
    function onError() {
        alert('There has been a problem retreiving the streams - are you running on file:/// or did you disallow access?');
    }

	/*
	 * Copy the video stream into a canvas as a picture.
	 */
    function takePhoto() {
        var photo = document.getElementById('photo'),
            context = photo.getContext('2d');
        photo.width = display.width;
        photo.height = display.height;
        context.drawImage(display, 0, 0, photo.width, photo.height);
    }
	/*
	 * Copy the stream into the "color" canvas after add the current effect.
	 */
    function dispalyColor(displayImageData) {
        var colorCanvas = document.getElementById('color'),
            context = colorCanvas.getContext('2d');
        colorCanvas.width = display.width;
        colorCanvas.height = display.height;
        displayImageData.data = addEffects(displayImageData.data);
        context.putImageData(displayImageData, 0, 0);
    }
	/*
	 * Print the color into canvas.
	 * @see addColor
	 */
    function printColor(colordata) {
        var photo = document.getElementById('photo'),
            context = photo.getContext('2d');
		var imgData = context.getImageData(0, 0, display.width, display.height);
		imgData.data = addColor(imgData.data, colordata.data);
        context.putImageData(imgData, 0, 0);
    }
    /*
     * Make the pixel fusion according to fusionSeuil.
     */
    function fusionColors(color, oldColor) {
    	return Math.round(color + oldColor*(fusionSeuil-1))/fusionSeuil;
    }
	/*
	 * Print the color into the image
	 * @see isColorInColorRange
	 * @FIXME if not red
	 */
	function addColor(image, color) {
		var ecart = 0;
        for (var i = 0, l = color.length; i < l; i += 4) {
            if(isColorInColorRange(color, i, true)) {
            	// No fusion mode.
            	if(!fusion){
					image[i] = colorToPrint[0];
					image[i + 1] = colorToPrint[1];
					image[i + 2] = colorToPrint[2];
					image[i + 3] = colorToPrint[3];
				}
				// Fusion mode.
				else{
					image[i] = fusionColors(colorToPrint[0], image[i]);
					image[i + 1] = fusionColors(colorToPrint[1], image[i + 1]);
					image[i + 2] = fusionColors(colorToPrint[2], image[i + 2]);
					image[i + 3] = fusionColors(colorToPrint[3], image[i + 3]);
				}
			}
			// if started, compare to expected result value.
			if(compare){
				ecart = ecart + ((resultValue.data[i] > image[i]) ? (resultValue.data[i] - image[i]) : (image[i] - resultValue.data[i]));
				ecart = ecart + ((resultValue.data[i+1] > image[i+1]) ? (resultValue.data[i+1] - image[i+1]) : (image[i+1] - resultValue.data[i+1]));
				ecart = ecart + ((resultValue.data[i+2] > image[i+2]) ? (resultValue.data[i+2] - image[i+2]) : (image[i+2] - resultValue.data[i+2]));
				ecart = ecart + ((resultValue.data[i+3] > image[i+3]) ? (resultValue.data[i+3] - image[i+3]) : (image[i+3] - resultValue.data[i+3]));
			}
        }
        // Show the values ecart.
		if(compare){
	        ecart = 100-Math.round((ecart / color.length)/2.55);
	        if(ecart <= 100-seuil){
	        	//success
	        	alert('Success');
	        	printValue();
	        }
	        $('#startValue').text( ecart + ' %');
	        if((ecart * seuil)/100 < 20){
	        	$('#startValue').removeClass().addClass('badge badge-success');
	        }
	        else if((ecart * seuil)/100 < 50){
	        	$('#startValue').removeClass().addClass('badge badge-warning');
	        }
	        else{
	        	$('#startValue').removeClass().addClass('badge badge-important');
	        }
	   }
        return image;
	}
	/**
	 * Retunr if curent color is in vavalablecolor range.
	 * @retunr bool
	 */
	function isColorInColorRange(color, i, test){
		if(
			colorToSelect[0] + durete > color[i] && color[i] > colorToSelect[0] - durete
			&& colorToSelect[1] + durete > color[i+1] && color[i+1] > colorToSelect[1] - durete
			&& colorToSelect[2] + durete > color[i+2] && color[i+2] > colorToSelect[2] - durete
		) {
			return true;
		}
		else{
			return false;
		}
	}
	/*
	 * Set the durete value depending from form item value.
	 */
	function setdurete(){
		durete = document.getElementById('durete').value;
	}
	/*
	 * init print function
	 */
	function printValue(){
		if ($('#printValue').hasClass('active')){
			print = false;
			$('#printValue').removeClass('active');
		}
		else {
			print = true;
			$('#printValue').addClass('active');
		}
	}
	/*
	 * Start game
	 */
	function startButton(){
		$('#startButon').addClass('active');
		$('#startText').text('Restart');
		compare = true;
		takePhoto();
		setResultValue();
	}
	/*
	 * Start game
	 */
	function setFusion(){
		if ($('#fusion').hasClass('active')){
			fusion = false;
			$('#fusion').removeClass('active');
		}
		else {
			fusion = true;
			$('#fusion').addClass('active');
		}
	}
	/*
	 * Set the result value depending of the video flux
	 */
	function setResultValue(){
		// Show the "cible" image.
		$('#cible').fadeIn(200).delay(1000).fadeOut(500);
		//creation du canvas resultat.
        var photo = document.getElementById('photo'),
            context = photo.getContext('2d');
        photo.width = display.width;
        photo.height = display.height;
        context.drawImage(document.getElementById('cible'), 0, 0);
        resultValue = context.getImageData(0, 0, display.width, display.height);

        var imgData = resultValue;
        resultValue.data = addEffects(imgData.data, 'setwhite');
       context.putImageData(imgData, 0, 0);
	}
	
	/*
	 * Add an effect to the stream.
	 */
    function addEffects(data, tpmeffect) {
    	if(tpmeffect==undefined) {
    		tpmeffect=effect;
    	}
        for (var i = 0, l = data.length; i < l; i += 4) {
            switch (tpmeffect) {
				case 'colorDetect':
					if(isColorInColorRange(data, i)) {
                        data[i]     = 255;   // Red.
                        data[i + 1] = 0;     // Green.
                        data[i + 2] = 0;     // Blue.
                        data[i + 3] = 255;   // Alpha.
                    }
					else{
                        data[i]     = 255;   // Red.
                        data[i + 1] = 255;   // Green.
                        data[i + 2] = 255;   // Blue.
						data[i + 3] = 255;   // Alpha.
					}
					break;
				case 'setwhite' :
					data[i]   = 255;   // red
					data[i+1] = 255;   // green
					data[i+2] = 255;   // blue
					data[i+3] = 0;     // alpha
					break;
            }
        }
        return data;
    }
	/*
	 * Get the stream feed
	 */
    function streamFeed() {
        requestAnimationFrame(streamFeed);
        feedContext.drawImage(video, 0, 0, display.width, display.height);
        imageData = feedContext.getImageData(0, 0, display.width, display.height);
		
        displayContext.putImageData(imageData, 0, 0);
		
		if(print) {
			printColor(imageData);
		}
		dispalyColor(imageData);
    }

	/*
	 * Set the event listners
	 */
    function initEvents() {
        var photoButton = document.getElementById('takePhoto');
        photoButton.addEventListener('click', takePhoto, false);
		
        var printButton = document.getElementById('printValue');
        printButton.addEventListener('click', printValue, false);
		
        var dureteButton = document.getElementById('durete');
        dureteButton.addEventListener('change', setdurete, false);
		
        var startBtn = document.getElementById('startButon');
        startBtn.addEventListener('click', startButton, false);
		
        var fusionBtn = document.getElementById('fusion');
        fusionBtn.addEventListener('click', setFusion, false);
    }
	/*
	 * Init the Script
	 */
    (function init() {
        requestStreams();
        initEvents();
    }());
    /*
     * Return public functions for interactions with jscolor.
     */
    return {
		updateSelectColor : function (color) {
			colorToSelect[0] = Math.round(color.rgb[0]*255);
			colorToSelect[1] = Math.round(color.rgb[1]*255);
			colorToSelect[2] = Math.round(color.rgb[2]*255);
		},
		updateInfo : function (color) {
			colorToPrint[0] = Math.round(color.rgb[0]*255);
			colorToPrint[1] = Math.round(color.rgb[1]*255);
			colorToPrint[2] = Math.round(color.rgb[2]*255);
		}
	}
})();
