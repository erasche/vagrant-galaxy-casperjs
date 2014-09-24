var viz_name = "ipython";
var height = 768;
var width = 1366;

// Internal variables
_picture_index = 0;

// Convenience function for storing screenshots
function screenshot(object){
    object.then(function(){
        var pic_name = _picture_index + ".png";
        casper.log("Generated Screenshot: " + pic_name, "info");
        object.capture(pic_name);
        _picture_index++;
    });
}

function galaxy_login(username, password, test){
    var login_url = 'http://localhost/galaxy/';
    test.assertTitle("", "galaxy main title is correct");
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
        test.assertExists('form#login', "Login form exists"); 
        test.assertExists('input[name="email"]', "Email field available"); 
        test.assertExists('input[name="password"]', "Password field available"); 
        this.fillSelectors('form#login', {
            'input[name="email"]': username,
            'input[name="password"]': password
        });
        screenshot(this);
        casper.log("Logging In...", "info");
        this.click('input[name="login_button"]');
        this.wait(2000, function(){
            casper.log("Did we log ourselves in?", "info");

            var available_cookies = phantom.cookies;
            var known_good_cookie = {
                "domain":"localhost",
                "httponly":true,
                "name":"galaxysession",
                "path":"/galaxy",
                "secure":false,
            };
            
            for(var key in known_good_cookie){
                var comp = (known_good_cookie[key] == available_cookies[0][key]);
                test.assert(comp, "Cookie contains correct value for " + key);
            }
            test.assert(available_cookies[0]['value'].length == 80, "Key of right length");
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

function create_dataset_from_text(dataset, test){
    // Load upload tool
    casper.open('http://localhost/galaxy/tool_runner?tool_id=upload1', function(test){
        test.assertHttpStatus(200);
        test.assertUrlMatch(/tool_id=upload1/, "Correct page opened");
        test.assertExists('form#tool_form', "Tool form exists"); 
        test.assertExists('textarea[name="files_0|url_paste"]', "Textarea available"); 
        test.assertExists('input[name="files_0|space_to_tab"]', "Spaces to tab available"); 
        // Switching to child frames is tough, lets just do in a new window
        this.fillSelectors('form#tool_form', {
            'textarea[name="files_0|url_paste"]': '#A B\n1 2\n3 4',
            'input[name="files_0|space_to_tab"]': true
        });
        screenshot(this);
        this.click('input[name="runtool_btn"]');
        //this.wait(2000, function(){
        //    casper.log("Waiting for upload tool to complete", "info");
        //});
    }(test));
    
    /*
    casper.thenOpen('http://localhost/galaxy', function(){
        // Wait for dataset processing to happen. Can take a few seconds. This will
        // be *very* unpleasant on heavily loaded VM host and may require
        // overriding waitForSelector to have a longer timeout.
        this.wait(8000, function(){
            screenshot(this);
        });
    });
    */
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

casper.test.begin('Galaxy Login', 10, function suite(test_suite){
    casper.start("http://localhost/", function(){
    });
    galaxy_login('admin@local.host', 'password', test_suite);

    casper.run(function(){
        test_suite.done();
    });
});

casper.test.begin("Dataset Creation", 5, function suite(test){
    casper.start('http://localhost/galaxy/tool_runner?tool_id=upload1', function(){
            test.assertHttpStatus(200);
            test.assertUrlMatch(/tool_id=upload1/, "Correct page opened");
            test.assertExists('form#tool_form', "Tool form exists"); 
            test.assertExists('textarea[name="files_0|url_paste"]', "Textarea available"); 
            test.assertExists('input[name="files_0|space_to_tab"]', "Spaces to tab available"); 
            // Switching to child frames is tough, lets just do in a new window
            this.fillSelectors('form#tool_form', {
                'textarea[name="files_0|url_paste"]': '#A B\n1 2\n3 4',
                'input[name="files_0|space_to_tab"]': true
            });
            screenshot(this);
            this.click('input[name="runtool_btn"]');
            this.wait(5000, function(){
                casper.log("Waiting for upload tool to complete", "info");
            });
    }).run(function(){
        test.done();
    });
});
casper.test.begin("Interactive Environment Tests", 2, function suite(test_suite){
    casper.start("http://localhost/galaxy/", function(){
        this.wait(5000, function(){
            casper.log("Waiting for upload tool to complete", "info");
            var dataset_id = this.evaluate(function(){
                var element = $("#current-history-panel div.dataset");
                // hda-a7810ee58d3f4666
                // Recently changed to
                // dataset-7120d03ef1032efc
                return element.attr('id').substring(8);
            });
            ie_url = "http://localhost/galaxy/visualization/show/" + viz_name + "?dataset_id=" + dataset_id;
            test_suite.assert(dataset_id.length == 16, "Got a dataset ID");

            casper.then(function(){
                // http://f.q.d.n/galaxy/visualization/show/ipython?dataset_id=a7810ee58d3f4666
                // Open, screenshot while loading
                test_suite.assertUrlMatch(/dataset_id=/, "At correct URL?");
                casper.thenOpen(ie_url, function(){
                    this.wait(1000, function(){
                        screenshot(this);
                    });
                });
                //Take some screenshots during loading.
                casper.then(function(){
                    for(var i=0; i < 10; i++){
                        this.wait(1000, function(){
                            screenshot(this);
                        });
                    }
                });

                casper.then(function(){

                });
            });

        });
    });
    casper.run(function(){
        test_suite.done();
    });
});
