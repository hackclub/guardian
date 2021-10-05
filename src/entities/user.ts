import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from 'typeorm'
import { Report } from './report'

export enum UserState {
	None,
	Creating,
	Notes,
	Where,
	Files,
}

@Entity()
export class User extends BaseEntity {
	@PrimaryColumn()
	id: string

	@Column({
		type: 'enum',
		enum: UserState,
		default: UserState.None,
	})
	state: UserState

	@Column({ nullable: true })
	title?: string

	@Column({ nullable: true })
	notes?: string

	@Column({ nullable: true })
	where?: string

	@Column('jsonb', { default: [], nullable: true })
	files: object[]

	@OneToMany(() => Report, (r) => r.user)
	reports: Report[]

	public static async onboardGet(id: string): Promise<[User, boolean]> {
		let user = await User.findOne(id)
		const exists = !!user
		if (!user) {
			const _user = User.create()
			_user.state = UserState.Creating
			_user.id = id
			await _user.save()
			user = _user
		}

		return [user, exists]
	}

	public async incrementState() {
		if (this.state === UserState.Files) {
			this.state = UserState.None
		} else {
			this.state += 1
		}

		await this.save()

		return this
	}

	public async commitReport() {
		const report = Report.create()
		report.files = this.files
		report.notes = this.notes
		report.title = this.title
		report.where = this.where
		report.user = this
		await report.save()

		this.files = []
		this.notes = ''
		this.title = ''
		this.where = ''
		console.log(this.reports)
		// this?.reports.push(report)

		await this.save()

		return report
	}
}
