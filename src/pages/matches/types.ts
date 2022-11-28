// 比赛日程，用于渲染界面
export interface Matches {
  ret: number
  code: number
  msg: string
  data: {
    // 比赛日期、数据的键值对："{20211115:{}}"
    scheduleList: { [key: string]: ScheduleList };
    isShowList: number;
    // 1636819200
    prevtime: number;
    // 1636819200
    nexttime: number;
    // "上周 11.08-11.14"
    prevdate: string;
    // "下周 11.22-11.29"
    nextdate: string;
  }
}

// API，某日的比赛数据
export interface ScheduleList {
  // 日期，如"20211115"。此属性为自定义添加的属性，用于判断最近一日的比赛以变色
  dateKey: string
  // 当日的开始的时间戳：1636905600
  time: number
  // "11-15"
  date: string
  // "周一"
  week: string
  // 当日游戏场数的列表，为false表示没有比赛
  list: Game[]
  // "11-15 星期一"
  lDate: string
  // "2021-11-15"
  filterdate: Date
  selected: boolean
}

// API，某场比赛的数据
export interface Game {
  // "V5"
  oneseedname: string
  // "IG"
  twoseedname: string
  // "14:00"
  starttime: string
  // "0"
  onewin: string
  // "0"
  twowin: string
  // 局数：1、3、5
  bonum: number
  // 主队图标 "https://static.wanplus.cn/data/lol/team/6643_mid.png"
  oneicon: string
  // 客队图标
  twoicon: string
  // 是否已结束
  isover: boolean
  // 是否正在比赛中
  live: boolean
  // 观赛地址
  liveList: Array<{
    // "1568743"
    id: string
    // "虎牙"
    name: string
  }>
  // 比赛的日期："20211115"
  relation: string
  // "11月15日 周一"
  date: string
  // 海报：https://static.wanplus.cn/data/event/banner/1069_mid.jpg
  poster: string
  // 比赛名："2021NEST全国电子竞技大赛"
  ename: string
  // 组名："小组赛"
  groupname: string
  // 主队得分，-1：还没有结果；0：输；1：赢
  oneScore: number[]
  // 客队得分
  twoScore: number[]
}
