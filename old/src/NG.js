
(function(exports) {

///////////////////
// NEWGROUNDS API
///////////////////

var NG = {

	connect: function( apiId, encryptionKey, movieVersion ){

		//////////
		// Options

		var options;
		if(typeof arguments[0]==="object"){
			options = arguments[0];
		}else{
			options = {
				apiId: apiId,
				encryptionKey: encryptionKey,
				movieVersion: movieVersion
			};
		}
		options.movieVersion = options.movieVersion || "";

		//////////
		// Global settings

		NG.settings = options;
		NG.settings.publisherId = 1;

		//////////
		// If hosted on NG, attempt to get user from querystring

		var query = {};
		window.location.search.replace(
		    new RegExp("([^?=&]+)(=([^&]*))?", "g"),
		    function($0, $1, $2, $3) { query[$1] = $3; }
		);
		NG.registerSession(query);

		//////////
		// Get NG Connect parameters

		console.log("== Connecting to Newgrounds... ==");
		return promise.post(NG_SERVER,{

			tracker_id: NG.settings.apiId,
			command_id: "preloadSettings"

		}).then(function(result,error){

			// Handle errors
			if(error){
				console.log("Something messed up, I guess.");
				return;
			}

			// Store properties
			NG.connection = JSON.parse(result);
			NG.saveGroups = NG.connection.save_groups || [];
			NG.scoreBoards = NG.connection.score_boards || [];
			NG.medals = NG.connection.medals || [];

			// Complete
			console.log(NG.connection);
			console.log("== Connection Complete! ==");
			return (new Promise()).done(NG.connection);

		});

	},

	registerSession: function(config){
		NG.settings.sessionId = config.NewgroundsAPI_SessionID;
		NG.settings.username = config.NewgroundsAPI_UserName;
		NG.settings.userId = config.NewgroundsAPI_UserID;
	},

	login: function(){
    
	    // Open NG Passport in a new window/tab
	    var passport = window.open("https://www.newgrounds.com/login/remote/");
	    
	    // Parse incoming flashVars
	    window.addEventListener("message",function(event){
	        
	        // Register Session
	        var flashvars = event.data.response;
	        flashvars = JSON.parse(decodeURIComponent(flashvars));
	        console.log(flashvars);
	        NG.registerSession(flashvars);

	        // End this
	        passport.close();
	        promise.done(flashvars);

	    },false);

		// Promise you're logged in
		var promise = new Promise();
		return promise;
	    
	},

	loadScores: function( scoreBoardName, period, firstResult, numResults, tag ){

		//////////
		// Options

		var options;
		if(typeof arguments[0]==="object"){
			options = arguments[0];
		}else{
			options = {
				scoreBoardName: scoreBoardName,
				period: period,
				firstResult: firstResult,
				numResults: numResults,
				tag: tag
			};
		}
		options.period = options.period || "All-Time";
		options.firstResult = options.firstResult || 1;
		options.numResults = options.numResults || 10;
		options.tag = options.tag || null;

		//////////
		// Get Board ID

		var board = NG.scoreBoards.filter(function(board){
			return( board.name == scoreBoardName );
		})[0];

		//////////
		// Server Call
		// TODO: Cache

		var postData = {

			command_id: "loadScores",

			tracker_id: NG.settings.apiId,
			publisher_id: 1,

			board: board.id,

			period: options.period,
			num_results: options.numResults,
			page: options.firstResult

		};
		if(options.tag){
			postData.tag=options.tag;
		}
		return promise.post(NG_SERVER,postData).then(function(result,error){
			
			// Handle errors
			if(error){
				console.log("Something messed up, I guess.");
				return;
			}

			// Parse result
			var scoreBoard = JSON.parse(result);
			return (new Promise()).done(scoreBoard);

		});

	},

	postScore: function(scoreBoardName, numericScore, tag){

		// Get Board ID
		var board = NG.scoreBoards.filter(function(board){
			return( board.name == scoreBoardName );
		})[0];
		if(!board) return;

		// Secure post
	    return _securePost("postScore",{
	    	user_name: NG.settings.username,
	    	board: board.id,
	    	value: numericScore,
	    	tag: tag
	    })

	},

	unlockMedal: function(medalName){

		// Get Medal ID
		var medal = NG.medals.filter(function(medal){
			return( medal.medal_name == medalName );
		})[0];
		if(!medal) return;
		medal.medal_unlocked = true;

		// Secure post
	    return _securePost("unlockMedal",{
	    	medal_id: medal.medal_id
	    })

	}

};
exports.NG = NG;

//////////////
// SERVER
//////////////

var NG_SERVER = "http://ncase-proxy.herokuapp.com/www.ngads.com/gateway_v2.php";
var NG_SERVER_SAVEFILES = "http://ncase-proxy.herokuapp.com/www.ngads.com/savefile.php";

//////////////
// ENCRYPTION
//////////////

var ENCRYPTOR_RADIX = "/g8236klvBQ#&|;Zb*7CEA59%s`Oue1wziFp$rDVY@TKxUPWytSaGHJ>dmoMR^<0~4qNLhc(I+fjn)X";
var _encryptor = new BaseN(ENCRYPTOR_RADIX);

function _encryptHex(_arg1){
    var _local2 = (_arg1.length % 6);
    var _local3 = "";
    var _local4 = 0;
    while (_local4 < _arg1.length) {
    	var uint = parseInt(("0x" + _arg1.substr(_local4, 6))); // Base 16, coz 0x
        _local3 = ( _local3 + _encryptor.encodeUint(uint,4) );
        _local4 = ( _local4 + 6 );
    };
    //return ((_local2.tostring() + _local3));
    return ( (_local2+'') + _local3);
}

//////////////
// SECURE POSTING
//////////////

function _securePost(command,secureParams){

    // Non-secure Params
    var postData = {};
    postData.tracker_id = NG.settings.apiId;

    // Random Seed
    var seed = "";
    for(var i=0;i<16;i++) {
        seed = (seed + ENCRYPTOR_RADIX.charAt((Math.random() * ENCRYPTOR_RADIX.length)));
    };
    
    // Secure Metainfo
    postData.command_id = "securePacket";
    secureParams = secureParams || {};
    secureParams.command_id = command;
    secureParams.as_version = 3;
    secureParams.session_id = NG.settings.sessionId;
    secureParams.publisher_id = NG.settings.publisherId;
    secureParams.seed = seed;

    // Encryption
    
    var salt = md5(seed); // THIS WORKS
    var str = JSON.stringify(secureParams); // Not exact, order flips around. Hopefully this doesn't fuck up anything.
    var key = NG.settings.encryptionKey; // THIS HAS TO WORK
    var encoded = RC4.encrypt(str,key); // THIS WORKS
    var encrypted = _encryptHex(salt+encoded); // THIS WORKS

    postData.secure = encrypted;

    /////////////////////////////////
    /////////////////////////////////

    return promise.post( NG_SERVER, postData ).then(function(result,error){
		
		// Handle errors
		if(error){
			console.log("Something messed up, I guess.");
			return;
		}

		// Parse result
		var result = JSON.parse(result);
		console.log(result);
		return (new Promise()).done(result);

	});

}

})(window);