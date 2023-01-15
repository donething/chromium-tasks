import React, {useEffect, useState} from "react"
import {Box, Pagination, Stack, Tab, Tabs} from "@mui/material"
import {request, date} from "do-utils"
import {useSharedSnackbar} from "do-comps"
import type {DYSVideo} from "./types"
import type {DYSMyVideos, DYSSeries} from "./types"

// 需要保存到存储的数据
type DysInfo = {
  // 页面关闭前处在的 Tab 的 ID
  ctid: number
  // 每个 Tab 已浏览的页数
  pages: Array<number>
}

// 需要获取的合集的信息，一个元素用一个 Tab 展示
// 最近添加的必须在后面，以免保存到chromium storage中的数据错乱
// 保存的数据为页数，用于恢复网页时，恢复展示之前的 Tab 的页数
const SeriesInfos = [
  {
    title: "TA的视频",
    mid: "8739477",
    size: 30,
    // 获取“TA的视频”API和上面常规合集的API不一样，需要标志
    search: true
  },
  {
    title: "直播回放",
    mid: "8739477",
    series_id: "405144",
    size: 100,
  },
  {
    title: "解说比赛",
    mid: "8739477",
    series_id: "449435",
    size: 30
  }
]

// 过滤主页视频（search）
const filterSearch = (sec: number): boolean => {
  let date = new Date((sec - 24 * 3600) * 1000)
  let day = date.getDay()

  // 只返回 周二(2)、四(4)、六(6)、日(0)的视频
  return day === 0 || day === 2 || day === 4 || day === 6
}

// 根据人、时间过滤视频
const filterSL = (title: string): boolean => {
  // 不是 19 点场，直接返回
  if (title.indexOf("19点场") < 0) {
    return false
  }

  // 根据时间过滤
  let r = title.match(/(2\d+)年(\d+)月(\d+)日/)
  if (!r || r.length < 4) {
    return false
  }
  let date = new Date(r.slice(1).join("/"))
  let day = date.getDay()

  // 只返回 周二(2)、四(4)、六(6)、日(0)的视频
  return day === 0 || day === 2 || day === 4 || day === 6
}

// 创建所有数据的初始数组
const initDataList = (n: number): [][] => {
  let a = new Array(n)
  for (let i = 0; i < a.length; i++) {
    a[i] = []
  }
  return a
}

// 返回当前 Tab 的信息，用于恢复展示 Tab 关闭前的数据
const getDysInfo = async (): Promise<DysInfo> => {
  let data = await chrome.storage.sync.get({dys: {}})
  console.log("已恢复浏览信息的数据：", JSON.stringify(data.dys))
  return data.dys
}

// 保存 Tab 信息到地址栏，以便恢复
const setTabInfo = async (ctid: number, pages: Array<number>) => {
  let data: DysInfo = {ctid: ctid, pages: pages}
  await chrome.storage.sync.set({dys: data})
  console.log("已保存浏览信息的数据：", JSON.stringify(data))
}

// 获取DYS指定视频合集的组件
const DYSTabs = (): JSX.Element => {
  // 是否已完成初始化，当完成时，才开始联网加载数据
  const [hadInit, setHadInit] = useState(false)

  // 当前被选择的 Tab 的索引
  const [tabCurrent, setTabCurrent] = useState(0)

  // 每个标签内已获取视频的页数
  // 恢复 Tab 关闭前的页数信息
  const [pagesList, setPagesList] = useState<Array<number>>(new Array(SeriesInfos.length).fill(1))
  // 每个标签内视频的总页数
  const [pTotalList, setPTotalList] = useState<Array<number>>(new Array(SeriesInfos.length).fill(1))

  // 存储所有 Tab 内的视频合集的数据，每个元素表示一个标签
  // fill() 当参数为引用类型时，所有数组元素会共用这个引用，导致更改一个值时，其它元素的值也改变，所以需要避免
  const [dataList, setDataList] = useState<DYSVideo[][]>(initDataList(SeriesInfos.length))

  // 显示消息
  const {showSb} = useSharedSnackbar()

  // 切换标签即切换索引，索引从 0 开始
  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabCurrent(newValue)
    setTabInfo(newValue, pagesList)
  }

  // 获取数据
  const getData = async (ctid: number) => {
    let mid = SeriesInfos[ctid].mid
    let search = SeriesInfos[ctid].search
    let series_id = SeriesInfos[ctid].series_id
    let page = pagesList[ctid]
    let size = SeriesInfos[ctid].size

    // 获取“TA的视频”API
    let url = `https://api.bilibili.com/x/space/arc/search?mid=${mid}` +
      `&ps=${size}&pn=${page}&order=pubdate&order_avoided=true`
    // 常规合集 API
    if (!search) {
      url = `https://api.bilibili.com/x/series/archives?mid=${mid}` +
        `&series_id=${series_id}&only_normal=true&sort=desc&pn=${page}&ps=${size}`
    }

    let resp = await request(url)
    let obj: DYSMyVideos.MyVideosResp = await resp.json()
    if (obj.code !== 0) {
      showSb({open: true, severity: "error", message: `获取用户UID"${mid}"的视频集出错：${obj.message}`})
      console.log(`获取用户UID"${mid}"的视频集出错：${obj.message}`, url)
      return
    }

    // 设置该视频集的总页数
    let curPage: number
    let vList: DYSVideo[]
    // 根据不同API，提取数据
    if (search) {
      curPage = Math.ceil(obj.data.page.count / obj.data.page.ps)
      vList = obj.data.list.vlist.map(item => ({
        title: item.title,
        bvid: item.bvid,
        pic: item.pic,
        play: item.play,
        created: item.created
      }))
    } else {
      let objn = obj as unknown as DYSSeries.SeriesResp
      curPage = Math.ceil(objn.data.page.total / objn.data.page.size)
      vList = objn.data.archives.map((item: DYSSeries.Arc) => ({
        title: item.title,
        bvid: item.bvid,
        pic: item.pic,
        play: item.stat.view,
        created: item.pubdate
      }))
    }

    // 设置当前标签的总页数
    setPTotalList(prev => {
      let nArray = [...prev]
      nArray[tabCurrent] = curPage
      return nArray
    })

    // 填充需展示的数据
    setDataList(prev => {
      let nArray = [...prev]
      let add = vList
      // 对我的视频、直播视频过滤，对解说视频不需过滤
      if (search) {
        // 标题包含"解说"说明为解说视频，不需要过滤
        add = add.filter(v => v.title.toLowerCase().includes("解说") || filterSearch(v.created))
      }
      if (series_id === "405144") {
        add = add.filter(v => filterSL(v.title))
      }

      // 设置该标签内的数据（因为翻页，而不用追加）
      nArray[tabCurrent] = add

      return nArray
    })
  }

  // 初始化
  const init = async () => {
    let dysInfo = await getDysInfo()

    setTabCurrent(dysInfo.ctid || 0)

    if (dysInfo.pages && dysInfo.pages.length > 0) {
      // 以下两句，为了当新添加了 SeriesInfos 项目时，将存储的数据恢复到前面，后面则为新项目的数据
      let tmp = [...pagesList]
      tmp.splice(0, dysInfo.pages.length)
      // 恢复数据
      setPagesList([...dysInfo.pages, ...tmp])
    }
  }

  useEffect(() => {
    document.title = "B站视频集"

    init().then(() => setHadInit(true))
  }, [])

  // 当 Tab 改变时，仅当该 Tab 内数据为空时，才获取
  useEffect(() => {
    if (hadInit && dataList[tabCurrent].length === 0) {
      getData(tabCurrent)
    }
  }, [hadInit, tabCurrent])

  // 翻页
  useEffect(() => {
    // 首次获取，由标签变化时的 useEffect() 获取，避免重复获取首次数据
    if (dataList[tabCurrent].length === 0) {
      return
    }

    getData(tabCurrent).catch(() => {
      // 获取出错后，回退页数
      setPagesList(prev => {
        let n = [...prev]
        n[tabCurrent] = n[tabCurrent] - 1
        return n
      })
    })
  }, [pagesList])

  return (
    <Stack bgcolor={"background.paper"}
           sx={{height: "100vh", margin: "0 160px", display: "flex", flexFlow: "column"}}>
      {/* Tab 标签 */}
      <Box sx={{width: '100%', flex: "0 1 auto"}}>
        <Tabs value={tabCurrent} onChange={handleChange} centered={true}>
          {
            SeriesInfos.map(item => <Tab label={item.title}/>)
          }
        </Tabs>
      </Box>

      {/* 视频列表 */}
      <Box className="row-list link" sx={{flex: "1 1 auto", marginTop: 1, overflow: "auto"}}>
        {
          dataList[tabCurrent].map(item =>
            <Stack className="row-item" width={"160px"} padding={"10px"} margin={"3px"}>
              <a href={`https://www.bilibili.com/video/${item.bvid}`} target={"_blank"}>
                <img src={item.pic} style={{width: "160px", height: "100px", borderRadius: "4px"}} alt={"封面"}/>
              </a>

              <a className={"link line-2"} title={item.title} href={`https://www.bilibili.com/video/${item.bvid}`}
                 target={"_blank"}>{item.title}
              </a>

              <Stack direction={"row"} justifyContent={"space-between"} color={"#999"} marginTop={"3px"}>
                <span>{item.play}次</span>
                <span>{date(new Date(item.created * 1000), "YYYY-mm-dd")}</span>
              </Stack>
            </Stack>
          )
        }
      </Box>

      {/* 分页 */}
      <Box sx={{flex: "0 1 auto", marginTop: 2, marginBottom: 2, display: "flex", justifyContent: "center"}}>
        <Pagination page={pagesList[tabCurrent]} count={pTotalList[tabCurrent]} size={"large"}
                    onChange={(event: object, p: number) => setPagesList(prev => {
                      // 更新页数
                      let n = [...prev]
                      n[tabCurrent] = p
                      // 保存页数信息
                      setTabInfo(tabCurrent, n)
                      return n
                    })
                    }/>
      </Box>
    </Stack>
  )
}

export default DYSTabs