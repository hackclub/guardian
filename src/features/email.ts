import { App, ExpressReceiver } from '@slack/bolt'
import { X509Certificate, verify } from 'crypto'
import axios from 'axios'
import { NextFunction, Request, Response } from 'express'
import AWS, { S3, SES } from 'aws-sdk'
import { simpleParser } from 'mailparser'
import MailComposer from 'nodemailer/lib/mail-composer'
import Mail from 'nodemailer/lib/mailer'
import { conductDB } from '../shared/base'
import { emailReply } from '../transcript'

AWS.config.update({ region: 'us-east-1' })

const verifySnsRequest = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const body = JSON.parse(req.body)

		if (!body.SigningCertURL) {
			res.status(400).send('eek')
			return
		}

		const data = await (
			await axios(body.SigningCertURL, { responseType: 'arraybuffer' })
		).data
		const cert = new X509Certificate(data as Buffer)

		const stringToSign =
			req.header('x-amz-sns-message-type') === 'Notification'
				? `Message
${body.Message}
MessageId
${body.MessageId}
Subject
${body.Subject}
Timestamp
${body.Timestamp}
TopicArn
${body.TopicArn}
Type
${body.Type}
`
				: `Message
${body.Message}
MessageId
${body.MessageId}
SubscribeURL
${body.SubscribeURL}
Timestamp
${body.Timestamp}
Token
${body.Token}
TopicArn
${body.TopicArn}
Type
${body.Type}
`

		const isVerified = verify(
			'RSA-SHA1',
			Buffer.from(stringToSign),
			cert.publicKey,
			Buffer.from(body.Signature, 'base64')
		)

		if (isVerified) {
			next()
		} else {
			res.status(400).send('eek')
		}
	} catch (e) {
		res.status(400).send('eek')
	}
}

const s3 = new S3()
const ses = new SES()

const sendMail = async (params: Mail.Options) => {
	const composer = new MailComposer(params)
	await ses
		.sendRawEmail({
			RawMessage: { Data: await composer.compile().build() },
		})
		.promise()
}

interface MailMessage {
	mail: {
		commonHeaders: {
			from: string[]
			subject: string
		}
	}
	receipt: {
		action: {
			bucketName: string
			objectKey: string
		}
	}
}

export default (app: App, receiver: ExpressReceiver) => {
	receiver.router.use('/snsWebhook', verifySnsRequest)

	receiver.router.post('/snsWebhook', async (req, res) => {
		const body = JSON.parse(req.body)

		// eslint-disable-next-line default-case
		switch (req.header('x-amz-sns-message-type')) {
			case 'Notification':
				const message = JSON.parse(body.Message)
				const {
					mail: {
						commonHeaders: {
							from: [from],
							subject,
						},
					},
					receipt: {
						action: { bucketName, objectKey },
					},
				} = message as MailMessage

				// Fetch the message's content
				const object = await s3
					.getObject({
						Bucket: bucketName,
						Key: objectKey,
					})
					.promise()

				const parsedMail = await simpleParser(object.Body as Buffer)

				if (parsedMail.inReplyTo) {
					console.log("Ignoring message because it's a reply")
					return
				}

				try {
					await conductDB.create({
						Source: 'Email',
						'Email Address': parsedMail.from.value[0].address,
						Notes: `${subject}\n\n${parsedMail.text || parsedMail.html}`,
						Status: 'New',
						'Email Message ID': parsedMail.messageId,
					})
				} catch (e) {
					console.log(e)
					return
				}

				await sendMail({
					from: 'Orpheus <conduct@hackclub.com>',
					to: from,
					inReplyTo: parsedMail.messageId,
					text: emailReply().text,
					html: emailReply().html,
					subject: `Re: ${subject}`,
				})

				await app.client.chat.postMessage({
					channel: process.env.REPORT_CHANNEL,
					blocks: [
						{
							type: 'section',
							text: {
								type: 'mrkdwn',
								text: `:rotating_light: Attention, commies! A new CoC report has been filed by \`${parsedMail.from.value[0].address}\`.`,
							},
						},
						{
							type: 'section',
							text: {
								type: 'mrkdwn',
								text: `*Subject: ${subject}*\n\n${
									parsedMail.text || parsedMail.html
								}`,
							},
						},
						{
							type: 'context',
							elements: [
								{
									type: 'mrkdwn',
									text: `Submitted to conduct@hackclub.com by \`${from}\``,
								},
							],
						},
					],
				})

				break
			case 'SubscriptionConfirmation':
				await axios(body.SubscribeURL)
				console.log('Successfully subscribed to SNS')
				break
		}

		res.send('yay')
	})
}
