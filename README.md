# GeoRacer

A web-based game, works around google streetview to make a multiplayer game, allowing users to find objectives and compete against each other for the most points

# Things to do

- Dynamic random spawn locations
- Display users in streetview more clearly
  - Add labels to their names
- Add win conditions
	- When the game is won we want to take everyone back to their lobby and let them know who won, possibly a score systemonthis page?
- Create private games
- Add features to the lobby such as map select (with a little preview possible)


# Main Challenges

- Very little support for name tags on markers, initially tried a library called markers with labels, which was bugged 
	- (looking for new solution)
- Had an issue with google maps locations becoming outdated (i.e. the specific latitute longitude coordinates are no longer used in google maps), 
	- need to think how to account for this in the future