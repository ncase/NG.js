//////////////////
// MAIN LOGIC

NG.connect({

	apiId: "30437:HluZ7LWS",
	encryptionKey: "Fh303lEIt2qUdPKmAxLa8K3BaoJjqlwN"

}).then(refreshUI);

//////////////////
// REFRESH UI

function refreshUI(){

	if(NG.settings.userId){
		var metaDOM = document.getElementById("metainfo");
		metaDOM.innerHTML = "Hello, "+NG.settings.username+"!";
		refreshMedals();
	}

	document.getElementById("logged_in").style.display = NG.settings.userId ? 'block' : 'none';
	document.getElementById("logged_out").style.display = NG.settings.userId ? 'none' : 'block';

	refreshScores();

};

function refreshScores(){

	var scoreDOM = document.getElementById("score_board");
	scoreDOM.innerHTML = '... loading ...';

	NG.loadScores("Score").then( function(scoreBoard){

		var scores = scoreBoard.scores;

		var list = document.createElement("ol");
		scoreDOM.innerHTML = '';
		scoreDOM.appendChild(list);

		for(var i=0;i<scores.length;i++){
			var score = scores[i];
			var scoreInfo = document.createElement("li");
			scoreInfo.innerHTML = score.username + ": " + score.value;
			list.appendChild(scoreInfo);
		}
		
	} );

};

function refreshMedals(){

	var medalDOM = document.getElementById("medal_gallery");
	medalDOM.innerHTML = '';

	for(var i=0;i<NG.medals.length;i++){
		
		// Info
		var medal = NG.medals[i];
		//if(medal.medal_id<0) continue; // Hack: Deleted Medals
		var medalInfo = document.createElement("div");
		medalDOM.appendChild(medalInfo);
		
		// Icon
		var medalIcon = new Image();
		medalIcon.src = medal.medal_unlocked ? medal.medal_icon : "http://img.ngfiles.com/icons/medal_cover.png";
		medalInfo.appendChild(medalIcon);

		// Title
		var medalTitle = document.createElement("span");
		medalTitle.innerHTML = medal.medal_name;
		medalInfo.appendChild(medalTitle);

		// Unlock when clicked
		medalIcon.style.cursor = "pointer";
		medalIcon.onclick = (function(medal){
			return function(){
				NG.unlockMedal(medal.medal_name).then(refreshMedals);
			};
		})(medal);

	}

};

//////////////////
// BUTTONS

document.getElementById("score_submit").onclick = function(){
	
	var score = document.getElementById("score_number").value;
	score = parseFloat(score);
	NG.postScore("Score", score).then(refreshScores);

};

document.getElementById("ng_passport").onclick = function(){
	NG.login().then(refreshUI);
};
