import { signing_secret, token, name } from './config';
import { App } from "@slack/bolt";
import { filterDM, filterNoBotMessages, filterChannel } from './middleware/index';
import * as features from './features/index'

const app = new App({
    signingSecret: signing_secret,
    token: token
});

(async () => {
      // Start your app
  await app.start(process.env.PORT || 3000);

  console.log(`${name} is running! 🔥`);

  for (const [ feature, handler ] of Object.entries(features)) {
      handler(app);
      console.log(`Feature "${feature}" has been loaded.`)
  }
  
})()