// 关注中的主播在线列表
export interface FavOnlineResp {
  retval: string    // 成功时为"ok"
  reterr: string    // 成功时为""
  retinfo: {
    start: string   // 初始值为"0"
    count: number   // 关注中在线主播的数量
    next: number    // 初始化为 1
    objects: Array<{
      type: number  // 默认 0
      content: RoomStatus
    }>
  }
}

// 主播房间状态
export interface RoomStatus {
  // 手动设置，从 retinfo.objects[item].type 中获取，默认 0
  type: number

  // 视频 ID
  vid: string
  // 在播状态，在播为 1
  living_status: number
  // 在播状态，在播为 1
  living: number
  // 直播间的标题
  title: string
  // 直播地址
  play_url: string
  // 主播的头像封面（尺寸大于 logourl）
  logo_discover: string
  // 主播的头像封面
  logourl: string
  // 主播的 ID
  name: string
  // 主播的昵称
  nickname: string
  vip: string
  vip_level: number
  anchor_level: number
  level: number
  country: string
  // 直播间的权限，0 免费；7 收费
  permission: number
  // 主播分类的 ID
  topic_id: number
  // 背景图，可空
  bgpic?: string
  // 总观看的人数
  watch_count: number
  // 正在观看的人数
  watching_count: number
  // 关注数量
  like_count: number
  // 评论数量
  comment_count: number
  // 默认为 0
  duration: number
  // 直播的设备，如"ios"
  living_device: string
  // 直播的网络类型，如"lan"
  network_type: string
  // 直播开始的时间，如"2022-03-04 00:32:39"
  live_start_time: string
  // 直播停止的时间（无效值，和开始时间一致）
  live_stop_time: string
  // 水平方向（默认竖屏，值为"0"）
  horizontal: string
  // 主播所在的纬度
  gps_latitude: string | number
  // 主播所在的经度
  gps_longitude: string | number
  // 是否准许了GPS定位，是则为"1"
  gps: string
  location: string
  is_solo_waiting: boolean
  // 是否在播放电影
  is_movie: boolean
  // 网页播放链接
  share_url: string
  share_thumb_url: string
}
