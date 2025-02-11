import { Inject, Injectable } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { EmojisRepository } from '@/models/index.js';
import { DI } from '@/di-symbols.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireRoleOption: 'canManageCustomEmojis',
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		ids: { type: 'array', items: {
			type: 'string', format: 'misskey:id',
		} },
	},
	required: ['ids'],
} as const;

// TODO: ロジックをサービスに切り出す

// eslint-disable-next-line import/no-default-export
@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> {
	constructor(
		@Inject(DI.db)
		private db: DataSource,

		@Inject(DI.emojisRepository)
		private emojisRepository: EmojisRepository,

		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const emojis = await this.emojisRepository.findBy({
				id: In(ps.ids),
			});

			for (const emoji of emojis) {
				await this.emojisRepository.delete(emoji.id);
	
				await this.db.queryResultCache!.remove(['meta_emojis']);
	
				this.moderationLogService.insertModerationLog(me, 'deleteEmoji', {
					emoji: emoji,
				});
			}
		});
	}
}
