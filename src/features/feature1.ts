import { App } from '@slack/bolt';

const feature1 = async (app: App) => {
    app.message("listener1", async ({message, say}) => {
        say(`Hello World! <@${message.user}> said: ${message.text}`);
    })
}

export default feature1;