// char_pp API Mock 数据
// 注意：char_pp 使用标准 HTTP 状态码，不使用 code:20000 包装格式

const coaches = [
  { id: 1, name: '张继科', description: '世界冠军，正手拉球技术一流', is_active: true, created_at: '2024-01-10T08:00:00Z' },
  { id: 2, name: '马龙', description: '奥运冠军，全面型打法', is_active: true, created_at: '2024-01-15T09:00:00Z' },
  { id: 3, name: '王励勤', description: '三届世界冠军', is_active: false, created_at: '2023-12-01T10:00:00Z' }
]

const videoClassifications = [
  {
    cos_object_key: 'coaches/zhang/forehand_topspin_001.mp4',
    coach_name: '张继科',
    tech_category: 'forehand_topspin',
    sub_category: '正手拉冲',
    tech_detail: '上旋发力',
    action_type: 'attack',
    video_type: 'expert',
    confidence: 0.95,
    is_manually_overridden: false,
    classified_at: '2024-03-01T10:00:00Z'
  },
  {
    cos_object_key: 'athletes/student_001/backhand_push_001.mp4',
    coach_name: null,
    tech_category: 'backhand_push',
    sub_category: '反手控制',
    tech_detail: '短球控制',
    action_type: 'defense',
    video_type: 'athlete',
    confidence: 0.82,
    is_manually_overridden: true,
    classified_at: '2024-03-05T14:00:00Z'
  },
  {
    cos_object_key: 'coaches/ma/forehand_topspin_002.mp4',
    coach_name: '马龙',
    tech_category: 'forehand_topspin',
    sub_category: '正手连续进攻',
    tech_detail: '快速摩擦',
    action_type: 'attack',
    video_type: 'expert',
    confidence: 0.91,
    is_manually_overridden: false,
    classified_at: '2024-03-10T09:30:00Z'
  }
]

const standards = [
  {
    tech_category: 'forehand_topspin',
    version: 3,
    quality_type: 'high',
    coach_count: 2,
    dimension_count: 5,
    built_at: '2024-04-01T12:00:00Z',
    dimensions: [
      { name: '击球点高度', unit: 'cm', ideal: 85, min: 70, max: 100, sample_count: 120 },
      { name: '引拍幅度', unit: 'cm', ideal: 45, min: 35, max: 60, sample_count: 120 },
      { name: '触球角度', unit: 'degree', ideal: 75, min: 60, max: 90, sample_count: 118 },
      { name: '挥臂速度', unit: 'm/s', ideal: 8.5, min: 6.0, max: 12.0, sample_count: 115 },
      { name: '重心转移', unit: 'cm', ideal: 20, min: 10, max: 30, sample_count: 112 }
    ]
  },
  {
    tech_category: 'backhand_push',
    version: 2,
    quality_type: 'medium',
    coach_count: 1,
    dimension_count: 4,
    built_at: '2024-03-20T15:00:00Z',
    dimensions: [
      { name: '拍面角度', unit: 'degree', ideal: 85, min: 75, max: 95, sample_count: 80 },
      { name: '触球点', unit: 'cm', ideal: 30, min: 20, max: 45, sample_count: 80 },
      { name: '控制力度', unit: 'N', ideal: 15, min: 8, max: 25, sample_count: 78 },
      { name: '随挥距离', unit: 'cm', ideal: 25, min: 15, max: 35, sample_count: 75 }
    ]
  }
]

const diagnosisReport = {
  overall_score: 78,
  tech_category: 'forehand_topspin',
  video_path: 'athletes/test/sample.mp4',
  dimensions: [
    {
      name: '击球点高度',
      measured_value: 72,
      ideal: 85,
      min: 70,
      max: 100,
      deviation_level: 'minor',
      suggestion: '击球点偏低，建议在接触球时适当抬高击球点，增加上旋效果'
    },
    {
      name: '引拍幅度',
      measured_value: 42,
      ideal: 45,
      min: 35,
      max: 60,
      deviation_level: 'normal',
      suggestion: null
    },
    {
      name: '触球角度',
      measured_value: 55,
      ideal: 75,
      min: 60,
      max: 90,
      deviation_level: 'significant',
      suggestion: '触球角度偏小，拍面过于平直，建议更多摩擦球的上方以产生更强上旋'
    },
    {
      name: '挥臂速度',
      measured_value: 7.8,
      ideal: 8.5,
      min: 6.0,
      max: 12.0,
      deviation_level: 'normal',
      suggestion: null
    },
    {
      name: '重心转移',
      measured_value: 8,
      ideal: 20,
      min: 10,
      max: 30,
      deviation_level: 'significant',
      suggestion: '重心转移不足，击球时腿部力量未充分传导到手臂，建议加强腿部蹬地动作'
    }
  ],
  strengths: ['引拍幅度适中', '挥臂速度良好', '击球节奏稳定'],
  improvements: ['加强腰腿协调配合，增强重心转移', '注意调整触球角度，增加摩擦上旋', '保持击球点稳定']
}

const knowledgeBase = [
  {
    tech_category: 'forehand_topspin',
    version: 3,
    tech_point_count: 45,
    coach_count: 2,
    built_at: '2024-04-01T12:00:00Z'
  },
  {
    tech_category: 'forehand_topspin',
    version: 2,
    tech_point_count: 38,
    coach_count: 2,
    built_at: '2024-03-01T10:00:00Z'
  },
  {
    tech_category: 'backhand_push',
    version: 2,
    tech_point_count: 28,
    coach_count: 1,
    built_at: '2024-03-20T15:00:00Z'
  }
]

const teachingTips = [
  {
    id: 1,
    tech_category: 'forehand_topspin',
    content: '正手拉球时，击球前引拍要充分，让球拍在身体右后方形成足够的蓄力空间',
    source_clip: 'coaches/zhang/forehand_topspin_001.mp4#t=12.5,18.3',
    confidence: 0.92
  },
  {
    id: 2,
    tech_category: 'forehand_topspin',
    content: '触球瞬间主要摩擦球的中上部，拍面稍前倾（约75-80度），以产生强烈上旋',
    source_clip: 'coaches/ma/forehand_topspin_002.mp4#t=8.2,15.0',
    confidence: 0.88
  },
  {
    id: 3,
    tech_category: 'backhand_push',
    content: '反手推挡时，手腕适当放松，利用手腕的小幅摆动控制球的落点和旋转',
    source_clip: 'coaches/zhang/backhand_push_001.mp4#t=5.0,11.5',
    confidence: 0.85
  }
]

module.exports = [
  // ==================== 教练管理 ====================
  {
    url: '/api/v1/coaches',
    type: 'get',
    response: config => {
      const { include_inactive } = config.query
      const result = include_inactive === 'true'
        ? coaches
        : coaches.filter(c => c.is_active)
      return { code: 200, data: result }
    }
  },
  {
    url: '/api/v1/coaches',
    type: 'post',
    response: config => {
      const { name, description } = config.body
      if (coaches.find(c => c.name === name)) {
        return { code: 409, message: '教练名称已存在' }
      }
      const newCoach = {
        id: coaches.length + 1,
        name,
        description: description || null,
        is_active: true,
        created_at: new Date().toISOString()
      }
      coaches.push(newCoach)
      return { code: 201, data: newCoach }
    }
  },
  {
    url: '/api/v1/coaches/:id',
    type: 'patch',
    response: config => {
      const id = parseInt(config.url.match(/\/coaches\/(\d+)/)[1])
      const coach = coaches.find(c => c.id === id)
      if (!coach) return { code: 404, message: '教练不存在' }
      Object.assign(coach, config.body)
      return { code: 200, data: coach }
    }
  },
  {
    url: '/api/v1/coaches/:id',
    type: 'delete',
    response: config => {
      const id = parseInt(config.url.match(/\/coaches\/(\d+)/)[1])
      const coach = coaches.find(c => c.id === id)
      if (!coach) return { code: 404, message: '教练不存在' }
      coach.is_active = false
      return { code: 204, data: null }
    }
  },

  // ==================== 任务管理 ====================
  {
    url: '/api/v1/tasks/:task_id/coach',
    type: 'patch',
    response: config => {
      return { code: 200, data: { message: '教练关联成功' } }
    }
  },

  // ==================== 视频分类 ====================
  {
    url: '/api/v1/videos/classifications',
    type: 'get',
    response: config => {
      const { tech_category, video_type } = config.query
      let result = [...videoClassifications]
      if (tech_category) result = result.filter(v => v.tech_category === tech_category)
      if (video_type) result = result.filter(v => v.video_type === video_type)
      return { code: 200, data: result }
    }
  },
  {
    url: '/api/v1/videos/classifications/:key',
    type: 'patch',
    response: config => {
      return { code: 200, data: { message: '分类已更新', is_manually_overridden: true } }
    }
  },
  {
    url: '/api/v1/videos/classifications/refresh',
    type: 'post',
    response: () => {
      return {
        code: 200,
        data: {
          total_scanned: videoClassifications.length,
          reclassified: 2,
          skipped: 1
        }
      }
    }
  },
  {
    url: '/api/v1/videos/classifications/batch-submit',
    type: 'post',
    response: () => {
      return {
        code: 200,
        data: {
          task_ids: [
            'task-mock-001-aabbccdd',
            'task-mock-002-eeffgghh',
            'task-mock-003-iijjkkll'
          ]
        }
      }
    }
  },

  // ==================== 技术标准 ====================
  {
    url: '/api/v1/standards',
    type: 'get',
    response: () => {
      return {
        code: 200,
        data: standards.map(s => ({
          tech_category: s.tech_category,
          version: s.version,
          quality_type: s.quality_type,
          coach_count: s.coach_count,
          dimension_count: s.dimension_count,
          built_at: s.built_at
        }))
      }
    }
  },
  {
    url: '/api/v1/standards/:tech_category',
    type: 'get',
    response: config => {
      const tc = config.url.split('/api/v1/standards/')[1]
      const std = standards.find(s => s.tech_category === tc)
      if (!std) return { code: 404, message: '该技术类别暂无有效标准数据' }
      return { code: 200, data: std }
    }
  },
  {
    url: '/api/v1/standards/build',
    type: 'post',
    response: config => {
      const { tech_category } = config.body || {}
      return {
        code: 200,
        data: {
          success: tech_category ? 1 : 2,
          skipped: 0,
          failed: 0,
          message: tech_category
            ? `${tech_category} 标准重建成功`
            : '全量标准重建成功'
        }
      }
    }
  },

  // ==================== 动作诊断 ====================
  {
    url: '/api/v1/diagnosis',
    type: 'post',
    response: config => {
      const { tech_category } = config.body || {}
      if (!tech_category) {
        return { code: 422, message: '请指定技术类别' }
      }
      return { code: 200, data: { ...diagnosisReport, tech_category } }
    }
  },

  // ==================== 知识库 ====================
  {
    url: '/api/v1/knowledge_base',
    type: 'get',
    response: config => {
      const { tech_category } = config.query
      const result = tech_category
        ? knowledgeBase.filter(k => k.tech_category === tech_category)
        : knowledgeBase
      return { code: 200, data: result }
    }
  },
  {
    url: '/api/v1/teaching_tips',
    type: 'get',
    response: config => {
      const { tech_category } = config.query
      const result = tech_category
        ? teachingTips.filter(t => t.tech_category === tech_category)
        : teachingTips
      return { code: 200, data: result }
    }
  }
]
