import {
	Column,
	BaseEntity,
	PrimaryGeneratedColumn,
	ManyToOne,
	Entity,
	CreateDateColumn,
} from 'typeorm'
import { User } from './user'

@Entity()
export class Report extends BaseEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string

	@Column({ nullable: true })
	title?: string

	@Column({ nullable: true })
	notes?: string

	@Column({ nullable: true })
	where?: string

	@Column('jsonb', { default: [], nullable: true })
	files: object[]

	@ManyToOne(() => User, (u) => u.reports)
	user: User

	@CreateDateColumn()
	createdAt: Date
}
