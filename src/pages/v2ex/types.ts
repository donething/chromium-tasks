export type Resp<T> = {
  // 是否成功。如 true
  success: boolean
  // 返回的提示。如 "Node topics found"
  message: string
  // 数据
  result?: T
}

/**
 * 主题帖的基础信息
 * 用于获取指定节点下的主题列表，此时`Resp`完整类型为`Resp<TopicBasic[]>`
 */
export type TopicBasic = {
  // 主题的 ID
  id: number
  // 主题的标题
  title: string
  // 帖子的内容（纯文本格式）。如 "云函数中使用\r\n```js\r\nconst url = \"http...\r\n```..."
  content: string
  // 帖子的内容（HTML 格式）。如 "<p>当我在 uniapp 的云函数中使用</p>\n<pre><code class=\"lang..."
  content_rendered: string
  // 不知道意思，可能值为 0、1。不是指是否为 Markdown
  syntax: number
  // 主题的链接。如"https://www.v2ex.com/t/123456"
  url: string
  // 主题的回帖数量。如 15
  replies: number
  // 最后回复的用户。如"Livid"
  last_reply_by: string
  // 最后回复的时间。如 1638017308
  last_touched: number
  // 主题的发布时间。如 1638074275
  created: number
  // 最后修改的时间。如 1638078749
  last_modified: number
}

/**
 * 主题的具体信息
 * 用于获取主题信息，此时`Resp`完整类型为`Resp<Topic>`
 */
export type Topic = TopicBasic & {
  member: Member
  node: Node
  supplements?: Supplement[]
}

/**
 * 回帖的信息
 * 用于获取指定主题的回复列表，此时`Resp`完整类型为`Resp<Reply[]>`
 */
export interface Reply {
  // 回帖的 ID。如 12388789
  id: number
  // 回帖内容。参考 `TopicBasic`
  content: string
  // 回帖内容。参考 `TopicBasic`
  content_rendered: string
  // 发布时间。如 1669451452
  created: number
  // 回帖用户的信息
  member: Member
}

/**
 * 用户信息
 */
export type Member = {
  // 用户 ID。如 123
  id: number
  // 用户名。如 "Livid"
  username: string
  // 用户简介，可空
  bio: string
  // 用户网站，可空
  website: string
  // 用户的 GitHub 地址，可空
  github: string
  // 用户主页地址。如 "https://www.v2ex.com/member/livid"
  url: string
  // 用户的头像地址。如 "https://cdn.v2ex.com/avatar/a3d9/515/123_xxlarge.png?m=1669455149"
  avatar: string
  // 用户的头像地址，为老API有，而新API没有。如果上面为空，可以用这个：`Member.avatar || Memberavatar_large`
  avatar_large: string
  // 用户的注册时间。如 1579578455
  created: number
}

/**
 * 节点信息
 * 用于获取指定节点的信息，此时`Resp`完整类型为`Resp<Node>`
 */
export type Node = {
  // 节点的 ID。如 12
  id: number
  // 节点的地址。如 "https://www.v2ex.com/go/qna"
  url: string
  // 节点的英文名。如"qna"
  name: string
  // 节点的中文名。如"问与答"
  title: string
  // 节点的说明（HTML 格式）。如"一个更好的世界需要你持续地提出好问题。"
  header: string
  // 尾部。可能为""
  footer: string
  // 节点的图标地址。如 "https://cdn.v2ex.com/navatar/c20a/d4d7/12_xxxlarge.png?m=1650095340"
  avatar: string
  // 节点下当前的主题数量。如 193548
  topics: number
  // 节点的创建时间。如 1272211864
  created: number
  // 节点的上次修改时间。如 1650095340
  last_modified: number
}

/**
 * 附言（追加的内容）
 */
export interface Supplement {
  // 附言的 ID
  id: number
  content: string
  content_rendered: string
  syntax: number
  // 追加的时间。如 1669477031
  created: number
}