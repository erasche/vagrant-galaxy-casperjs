var viz_name = "ipython";
var height = 768;
var width = 1366;

// Internal variables
_picture_index = 0;

var casper = require('casper').create({
    verbose: true,
    logLevel: "debug",
    pageSettings: {
        loadImages: true,
        localToRemoteUrlAccessEnabled: true,
        viewportSize: {width: width, height: height},
    },
});

// Convenience function for storing screenshots
function screenshot(object){
    object.then(function(){
        var pic_name = _picture_index + ".png";
        casper.log("Generated Screenshot: " + pic_name, "info");
        object.capture(pic_name);
        _picture_index++;
    });
}

function galaxy_login(username, password){
    var login_url = 'http://localhost/galaxy/';
    casper.start(login_url, function() {
        // Remove any existing galaxy cookie
        phantom.deleteCookie('galaxysession');
        // After loading the login page, save it
        screenshot(this);
        // Print our cookies
        casper.log(JSON.stringify(phantom.cookies), "debug");
    });

    casper.wait(2000, function(){
        this.page.switchToChildFrame('galaxy_main');
        this.fillSelectors('form#login', {
            'input[name="email"]': username,
            'input[name="password"]': password
        });
        screenshot(this);
        casper.log("Logging In...", "info");
        this.click('input[name="login_button"]');
        this.wait(2000, function(){
            casper.log("Did we log ourselves in?", "info");
            casper.log("Post-login cookies: " + JSON.stringify(phantom.cookies), "debug");
            screenshot(this);
        });

    });
}

function load_main_page(){
    // Doesn't just load main page...also deletes existing datasets! (well...it tries to)
    casper.thenOpen('http://localhost/galaxy/', function(){
        // Delete all old history items
        casper.log("Removing old datasets", "info");
        this.wait(2000, function(){
            casper.log("Hopefully history has loaded...", "info");
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
            casper.log("Waiting for upload tool to complete", "info");
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

// Prints headers for all communication. Easier than using tcpdump.
var superDebug = false;
if(superDebug){
    casper.options.onResourceRequested = function(C, requestData, request) {
        casper.log("======= RD ========", "debug");
        ["method", "url"].map(function(item){
            casper.log(item + ": "+ response[item], "debug");
        });
        casper.log("Headers", "debug");
        for(var i in requestData.headers){
            casper.log(requestData.headers[i]['name'] +": "+ requestData.headers[i]['value'], "debug");
        }
    };
    casper.options.onResourceReceived = function(C, response) {
        casper.log("======= R ========", "debug");
        ["contentType", "redirectURL", "status", "statusText", "url"].map(function(item){
            casper.log(item + ": "+ response[item], "debug");
        });
        casper.log("Headers", "debug");
        for(var i in response.headers){
            casper.log(response.headers[i]['name'] +": "+ response.headers[i]['value'], "debug");
        }
    };
}
// print out all the messages in the headless browser context
casper.on('remote.message', function(msg) {
    casper.log('remote message caught: ' + msg, "info");
});

    // print out all the messages in the headless browser context
casper.on("page.error", function(msg, trace) {
    casper.log("Page Error: " + msg, "ERROR", 'error');
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
        // Recently changed to
        // dataset-7120d03ef1032efc
        return element.attr('id').substring(8);
    });
    ie_url = "http://localhost/galaxy/visualization/show/" + viz_name + "?dataset_id=" + dataset_id;
    // http://f.q.d.n/galaxy/visualization/show/ipython?dataset_id=a7810ee58d3f4666

    // Open, screenshot while loading
    casper.thenOpen(ie_url, function(){
        casper.log(this.getCurrentUrl(), "debug"); 
        this.wait(1000, function(){
            screenshot(this);
        });
        casper.log(this.getCurrentUrl(), "debug"); 
    });


    //Take some screenshots during loading.
    casper.then(function(){
        casper.log(this.getCurrentUrl(), "debug"); 
        for(var i=0; i < 10; i++){
            this.wait(1000, function(){
                screenshot(this);
            });
        }
    });


});

casper.run();
