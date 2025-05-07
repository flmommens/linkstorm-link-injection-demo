import defaultOpportunities from './opportunities.json';

function processOpportunity(opportunity) {
	const text = opportunity['Matching Text'];
	const start = text.indexOf('<em>');
	const end = text.indexOf('</em>');
	let anchor = (start !== -1 && end !== -1) ? text.substring(start + 4, end) : '';
	anchor = stripTags(anchor);
	let matchedSentence = prepareLimitedSnippet(text, 40 + anchor.length);
	matchedSentence = stripTags(matchedSentence);

	return {
		target: opportunity['Target Page URL'],
		accepted: opportunity['Status'],
		anchor: opportunity['Anchor'] ? opportunity['Anchor'] : anchor,
		matchedSentence: matchedSentence,
		status: null,
		type: opportunity['type'] || 'dynamic',
		id: opportunity['id'],
	};
}

function stripTags(input) {
	return input.replace(/<\/?[^>]+(>|$)/g, "");
}

function prepareLimitedSnippet(text, limit = 100) {
	const emStart = text.toLowerCase().indexOf('<em>');
	const emEnd = text.toLowerCase().indexOf('</em>', emStart) + 5;
	if (emStart === -1 || emEnd === -1) return text;
	let sentenceStart = text.lastIndexOf('.', emStart);
	sentenceStart = sentenceStart === -1 ? 0 : sentenceStart + 1;
	let sentenceEnd = text.indexOf('.', emEnd);
	sentenceEnd = sentenceEnd === -1 ? text.length : sentenceEnd + 1;
	let sentence = text.substring(sentenceStart, sentenceEnd);
	let previousSentenceStart = text.lastIndexOf('.', sentenceStart - 2);
	previousSentenceStart = previousSentenceStart === -1 ? 0 : previousSentenceStart + 1;
	const previousSentence = text.substring(previousSentenceStart, sentenceStart);
	let nextSentenceEnd = text.indexOf('.', sentenceEnd);
	nextSentenceEnd = nextSentenceEnd === -1 ? text.length : nextSentenceEnd + 1;
	const nextSentence = text.substring(sentenceEnd, nextSentenceEnd);
	if ((previousSentence + sentence + nextSentence).length <= limit) {
		return (previousSentence + sentence + nextSentence).trim();
	}
	if ((previousSentence + sentence).length <= limit) {
		return (previousSentence + sentence).trim();
	}
	if ((sentence + nextSentence).length <= limit) {
		return (sentence + nextSentence).trim();
	}
	return sentence.trim();
}

function getWebsitePageOpportunities(pageUrl, opportunities) {
	return opportunities.filter(row =>
		row['Source Page URL'] === pageUrl &&
		row['Status'] === 'accepted'
	).map(processOpportunity);
}

const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, HEAD, PUT, PATCH, POST, DELETE, OPTIONS',
	'Access-Control-Max-Age': '86400',
};

function handleOptions(request) {
	// Make sure the necessary headers are present
	// for any OPTIONS request.
	let headers = request.headers;
	if (
		headers.get('Origin') !== null &&
		headers.get('Access-Control-Request-Method') !== null &&
		headers.get('Access-Control-Request-Headers') !== null
	) {
		// Handle CORS preflight requests.
		return new Response(null, {
			headers: {
				...corsHeaders,
				'Access-Control-Allow-Headers': headers.get('Access-Control-Request-Headers'),
			},
		});
	} else {
		// Handle standard OPTIONS request.
		return new Response(null, {
			headers: {
				...corsHeaders,
				Allow: 'GET, HEAD, POST, OPTIONS',
			},
		});
	}
}

export default {
	async fetch(request) {
		const opportunities = defaultOpportunities;

		// verify opportunities is an array
		if (!Array.isArray(opportunities)) {
			console.log(opportunities);
			return new Response(JSON.stringify({ error: 'Invalid opportunities' }), {
				status: 500,
				headers: { ...corsHeaders, 'content-type': 'application/json' },
			});
		}

		const url = new URL(request.url);

		if (request.method === 'OPTIONS') {
			return handleOptions(request);
		}

		if (url.pathname === '/') {
			return new Response(JSON.stringify({ hello: 'world' }), {
				status: 200,
				headers: { ...corsHeaders, 'content-type': 'application/json' },
			});
		}
		if (url.pathname === '/get_website_page_opportunities') {
			const pageUrl = url.searchParams.get('pageUrl');
			if (!pageUrl || typeof pageUrl !== 'string') {
				return new Response(JSON.stringify({ error: 'Invalid pageUrl' }), {
					status: 400,
					headers: { ...corsHeaders, 'content-type': 'application/json' },
				});
			}
			try {
				const result = getWebsitePageOpportunities(pageUrl, opportunities);
				return new Response(JSON.stringify(result), {
					status: 200,
					headers: { ...corsHeaders, 'content-type': 'application/json' },
				});
			} catch (e) {
				console.error(e);
				return new Response(JSON.stringify({ error: 'Internal server error' }), {
					status: 500,
					headers: { ...corsHeaders, 'content-type': 'application/json' },
				});
			}
		}
		return new Response('Not Found', { status: 404, headers: corsHeaders });
	},
};