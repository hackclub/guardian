export function emailReply() {
	return {
		text: `Hey there, thanks for getting in touch! We've received your CoC report and are working to resolve this. I'm just a bot, but you should hear back from a human soon! 


Happy hacking,
🦕 Orpheus
Chief Dino, Hack Club`,
		html: `<!DOCTYPE html>
<body>
<p>
Hey there, thanks for getting in touch! We've received your CoC report and are working to resolve this. I'm just a bot, but you should hear back from a human soon! 
</p>

<p>
Happy hacking,<br />
🦕 Orpheus<br />
Chief Dino, <a href="https://hackclub.com">Hack Club</a>
</p>

<img src="https://cloud-masz3wezz-hack-club-bot.vercel.app/0flag-orpheus-top.png" width="100px" />
</body>`,
	}
}
