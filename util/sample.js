var viz_name = "ipython";
var height = 720;
var width = 1280;

var casper = require('casper').create({
    verbose: true,
    logLevel: "debug",
    pageSettings: {
        loadImages: true,
        localToRemoteUrlAccessEnabled: true,
        viewportSize: {
            width: 1366,
            height: 768
        },
    },
});

// Convenience function for storing screenshots
picture_index = 0;
function screenshot(object){
    var pic_name = picture_index + ".png";
    console.debug("Generated Screenshot: " + pic_name);
    object.capture(pic_name);
    picture_index++;
}
var superDebug = false;

if(superDebug){
    casper.options.onResourceRequested = function(C, requestData, request) {
        console.log("======= RD ========");
        ["method", "url"].map(function(item){
            console.log(item + ": "+ response[item]);
        });
        console.log("Headers");
        for(var i in requestData.headers){
            console.log(requestData.headers[i]['name'] +": "+ requestData.headers[i]['value']);
        }
        console.log("\n\n");
    };
    casper.options.onResourceReceived = function(C, response) {
        console.log("======= R ========");
        ["contentType", "redirectURL", "status", "statusText", "url"].map(function(item){
            console.log(item + ": "+ response[item]);
        });
        console.log("Headers");
        for(var i in response.headers){
            console.log(response.headers[i]['name'] +": "+ response.headers[i]['value']);
        }
        console.log("\n\n");
    };
}
// print out all the messages in the headless browser context
casper.on('remote.message', function(msg) {
    this.echo('remote message caught: ' + msg);
});

    // print out all the messages in the headless browser context
casper.on("page.error", function(msg, trace) {
    this.echo("Page Error: " + msg, "ERROR");
});

/*
casper.start('http://localhost/', function() {
    this.echo(this.getTitle());
    this.capture('00-index.png');
});

// Go to galaxy
casper.then(function() {
    this.click('body a');
});

// This should be the login page
casper.then(function(){
    console.log('clicked ok, new location is ' + this.getCurrentUrl());
    this.capture('01-login.png');
});


// Attempt to login
*/


var login_url = 'http://localhost/galaxy/';
casper.start(login_url, function() {
    // Remove any existing galaxy cookie
    phantom.deleteCookie('galaxysession');
    // After loading the login page, save it
    screenshot(this);
    // Print our cookies
    this.echo(JSON.stringify(phantom.cookies));
});

casper.wait(2000, function(){
    this.page.switchToChildFrame('galaxy_main');
    this.fillSelectors('form#login', {
        'input[name="email"]': 'admin@local.host',
        'input[name="password"]': 'password',
    });
    screenshot(this);
    console.log("Logging In...");
    this.click('input[name="login_button"]');
    this.wait(2000, function(){
        console.log("Did we log ourselves in?");
        this.echo("Post-login cookies: " + JSON.stringify(phantom.cookies));
        screenshot(this);
    });

});

casper.thenOpen('http://localhost/galaxy/', function(){
    // Delete all old history items
    this.echo("Removing old datasets");
    this.wait(2000, function(){
        this.echo("Hopefully history has loaded...");
        this.evaluate(function(){
            $( "a.dataset-delete" ).each(function() {
                $( this ).click();
            });
        });
    });
    screenshot(this);
});

// Load upload tool
casper.thenOpen('http://localhost/galaxy/tool_runner?tool_id=upload1', function(){
    // Switching to child frames is tough, lets just do in a new window
    this.fillSelectors('form#tool_form', {
        'textarea[name="files_0|url_paste"]': '#A B\n1 2\n3 4',
        'input[name="files_0|space_to_tab"]': true
    });
    screenshot(this);
    this.click('input[name="runtool_btn"]');
    this.wait(2000, function(){
        console.log("Waiting for upload tool to complete");
    });
});

casper.thenOpen('http://localhost/galaxy', function(){
    // Wait for dataset processing to happen. Can take a few seconds. This will
    // be *very* unpleasant on heavily loaded VM host and may require
    // overriding waitForSelector to have a longer timeout.
    this.wait(5000, function(){
            screenshot(this);
    });
    // Make doubly sure that it's there. Timeout is 1-5 seconds I think.
    this.waitForSelector('div.dataset.state-ok', function(){
        // Wait for fade in animation to complete
        this.wait(500, function(){
                screenshot(this);
        });
    });
});

ie_url = '';
casper.then(function(){
    var dataset_id = this.evaluate(function(){
        var element = $("#current-history-panel div.dataset");
        // hda-a7810ee58d3f4666
        return element.attr('id').substring(4);
    });
    ie_url = "http://localhost/galaxy/visualization/show/" + viz_name + "?dataset_id=" + dataset_id;
    // http://f.q.d.n/galaxy/visualization/show/ipython?dataset_id=a7810ee58d3f4666


    casper.thenOpen(ie_url, function(){

        console.log(this.getCurrentUrl()); 
        this.wait(1000, function(){
            screenshot(this);
        });
        console.log(this.getCurrentUrl()); 
    });


    casper.then(function(){
        console.log(this.getCurrentUrl()); 
        for(var i=0; i < 20; i++){
            this.wait(1000, function(){
                screenshot(this);
            });
        }
    });


});




casper.run();
