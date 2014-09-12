var viz_name = "ipython";
var height = 720;
var width = 1280;

// Internal variables
_picture_index = 0;

var casper = require('casper').create({
    verbose: true,
    logLevel: "debug",
    pageSettings: {
        loadImages: true,
        localToRemoteUrlAccessEnabled: true,
        viewportSize: {
            width: width,
            height: height
        },
    },
});

// Convenience function for storing screenshots
function screenshot(object){
    var pic_name = _picture_index + ".png";
    console.debug("Generated Screenshot: " + pic_name);
    object.capture(pic_name, {
        top: 0,
        left: 0,
        width: width,
        height: height
    });
    _picture_index++;
}

function galaxy_login(username, password){
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
            'input[name="email"]': username,
            'input[name="password"]': password
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
}

function load_main_page(){
    // Doesn't just load main page...also deletes existing datasets! (well...it tries to)
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

}

function create_dataset_from_text(dataset){
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

galaxy_login('admin@local.host', 'password');
// Should probably actually have some asserts
load_main_page();
// Add a dataset. Will have a companion _from_file later.
create_dataset_from_text('#A B\n1 2\n3 4');

ie_url = '';
casper.then(function(){
    var dataset_id = this.evaluate(function(){
        var element = $("#current-history-panel div.dataset");
        // hda-a7810ee58d3f4666
        return element.attr('id').substring(4);
    });
    ie_url = "http://localhost/galaxy/visualization/show/" + viz_name + "?dataset_id=" + dataset_id;
    // http://f.q.d.n/galaxy/visualization/show/ipython?dataset_id=a7810ee58d3f4666

    // Open, screenshot while loading
    casper.thenOpen(ie_url, function(){
        console.log(this.getCurrentUrl()); 
        this.wait(1000, function(){
            screenshot(this);
        });
        console.log(this.getCurrentUrl()); 
    });


    //Take some screenshots during loading.
    casper.then(function(){
        console.log(this.getCurrentUrl()); 
        for(var i=0; i < 10; i++){
            this.wait(1000, function(){
                screenshot(this);
            });
        }
    });


});

casper.run();
