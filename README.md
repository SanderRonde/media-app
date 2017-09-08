# Media App

Plays your watch later playlist and keeps your progress.
Download can be found [here](https://github.com/SanderRonde/media-app/releases)

## Shortcuts

### Youtube Subscriptions

* Use the arrow keys to navigate the selected video
* Press ```Space/Enter``` to launch the selected video
* Press H to hide/show the video and go back to the subbox view
* Pressing ```H``` toggles hiding the video and showing the page layout only
* Scrolling on the video changes volume (up = raise, down = lower) 
* Pressing ```D``` downloads the current video as MP3
* Pressing ```K``` hides the video on the page, only showing the rest of the body,
	this is meant as a way to turn off features like auto-play and to log in etc.

### Youtube Playlists

* Pressing ```H``` hides the video and shows you the page layout only
* Pressing ```V``` shows/hides the visualizer (on by default)
* Scrolling on the video changes volume (up = raise, down = lower)
* Pressing ```?``` identifies the current song (if possible) and shows it to you
* Pressing ```D``` downloads the song once the ```?``` dialog is up


### Youtube Search

* Pressing ```H``` toggles hiding the video and showing the search page only
* Pressing ```S``` toggles the search bar (if currently looking at the video)
* Scrolling on the video changes volume (up = raise, down = lower)
* Pressing ```Tab``` on the search page focusses the search bar
* Pressing any key that is not a different shortcut (```H```, ```S```) brings up
	the search bar, focusses it and enters what you just pressed
* Pressing ```Esc``` hides search bar suggestions
* Pressing up/down changes suggestion selection
* Pressing ```Shift+Space``` shows suggestions when the search bar is focussed

### Netflix

* None

### Generic Shortcuts

* Pressing ```Esc``` 3 times quickly exits the app
* Pressing ```F1``` switches to the youtube subscriptions view
* Pressing ```F2``` switches to the youtube music view
* Pressing ```F3``` switches to the youtube search view
* Pressing ```F4``` switches to the netflix view
* Pasting any youtube link through ```Ctrl+V``` anywhere takes you to 
	the youtubeSearch view where that video will play

### Desktop Global Shortcuts

* ```Shift+Alt+F``` focusses the app
* ```Shift+Alt+Left``` lowers the volume
* ```Shift+Alt+Right``` raises the volume
* ```Shift+Alt+Left``` lowers the volume
* ```Shift+Alt+Down``` or the ```MediaPlayPause``` button plays/pauses what is currently playing
* ```Shift+Alt+Up``` or the ```MediaNextTrack``` button selects the next video in youtube subs view
* ```MediaStop``` pauses what is currently playing

## Remote

When running, a remote control page will be hosted on ```http://{localIp}:1234```. Going to
	this address on a mobile phone brings up a remote control like application. From here you
	can control the app, switch views etc. There are also two "cast" buttons, one regular cast
	and one with the "hidden" icon. These add a video to play to the youtube search view queue.
	By using the hidden icon, you can hide the title and thumbnail of the video you "casted".