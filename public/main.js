'use strict';
let log = console.log;

let btnAvtorize = document.querySelector('.avtorization');
btnAvtorize.onclick = e => window.location.href = 'https://discord.com/api/oauth2/authorize?client_id=879269108212965449&redirect_uri=http%3A%2F%2Flocalhost%3A3000&response_type=code&scope=identify';

alert('angle vector (3, 4) = '+(vec2(3, 4).angle).toFixed(4)+'rad or '+(vec2(3, 4).angle / (Math.PI/180)).toFixed(4)+'deg');


/*
<a id="login" style="display: none;" href="your-oauth2-URL-here">Identify Yourself</a>
<script>
*/

// const fragment = new URLSearchParams(window.location.search);
// const code = fragment.get('code');

// log(fragment, code);

// if(code) {


fetch(location.origin+'/database.json')
	.then(data => data.json())
	.then(data => {
		log(data);
	});
/*
fetch('https://discord.com/api/users/@me', {
	headers: {
		authorization: `${'Bearer'} ${code}`
	//	authorization: `${tokenType} ${accessToken}`
	}
})
	.then(data => data.json())
	.then(data => {
		log(data);
	})
	.catch(console.error);
// };

/*
fetch('https://discord.com/api/users/@me')
	.then(data => data.json())
	.then(data => {
		log('=============');
		console.log(data);
	})
	.catch(console.error);
*/