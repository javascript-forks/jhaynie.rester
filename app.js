var express = require('express'),
	bodyParser = require('body-parser'),
	request = require('request'),
	_ = require('lodash'),
	highlight = require('highlight.js'),
	app = express();

app.use(bodyParser.json());
app.use('/jquery', express.static('./bower_components/jquery/dist'));
app.use('/bootstrap', express.static('./bower_components/bootstrap/dist'));
app.use('/highlight', express.static('./node_modules/highlight.js/styles'));
app.use('/', express.static('./public'));

var fields = ['httpVersion','headers','url','statusCode'];

app.post('/testapi', function(req, res){
	var body = req.body,
		opts = {};

	// console.log(body);

	opts.method = body.method || 'GET';
	opts.url = body.url;
	opts.headers = {};
	body.body && (opts.body = body.body);
	
	opts.followRedirect = body.redirects === 'on';
	opts.followAllRedirects = body.redirects === 'on';

	opts.gzip = body.uncompress === 'on';

	if (body.auth_type) {
		switch (body.auth_type) {
			case 'basic': {
				opts.auth = {
					username: body['auth-name'],
					password: body['auth-value'],
					sendImmediately: true
				};
				break;
			}
			case 'digest': {
				opts.auth = {
					username: body['auth-name'],
					password: body['auth-value'],
					sendImmediately: false
				};
				break;
			}
		}
	}

	if (body['content-type']) {
		opts.headers['Content-Type'] = body['content-type'];
	}

	if ('header-name' in body) {
		var names = body['header-name'],
			values = body['header-value'];
		if (Array.isArray(names)) {
			names.forEach(function(name, index){
				opts.headers[name] = values[index];
			});
		}
		else {
			opts.headers[names] = values;
		}
	}

	if (!('user-agent' in opts.headers) && !('User-Agent' in opts.headers)) {
		opts.headers['User-Agent'] = body.user_agent || 'Appcelerator API Tester/1.0';
	}

	var ts = Date.now();
	// console.log(opts)
	
	request(opts, function(err, response, body){
		var duration = Date.now()-ts;
		// console.log(body)
		if (body && response && response.headers && 'content-type' in response.headers) {
			var ct = response.headers['content-type'];
			if (ct.indexOf('/json') > 0) {
				// we are going to pretty-print JSON
				try {
					body = JSON.stringify(JSON.parse(body), null, 3);
				}
				catch (E) {
				}
			}
		}
		var hl = body && highlight.highlightAuto(body);
		res.send({
			success: !err,
			response: _.pick(response,fields),
			body: body,
			body_html: hl && hl.value,
			body_lang: hl && hl.language,
			responseTime: duration,
			responseSize: (body && body.length) || 0
		});
	});
});

var server = app.listen(process.env.PORT||8080, function() {
    console.log('Listening on port %d', server.address().port);
});
