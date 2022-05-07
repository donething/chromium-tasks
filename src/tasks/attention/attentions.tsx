import React, {useEffect} from "react"
import Stack from "@mui/material/Stack"
import Anchors from "./anchors"
import Apps from "./apps"

// 存到 chromium storage 中的格式
// {"attentions": {"anchors": {}, "apps": {}}}

// 关注组件中某项的类型
export type AItemType<T> = { list: Array<T>, enable?: boolean, enableNotify?: boolean }

// 关注组件
const Attentions = () => {
  useEffect(() => {
    document.title = `关注 - ${chrome.runtime.getManifest().name}`
  }, [])

  return (
    <Stack direction={"row"} spacing={2}>
      <Anchors sx={{width: 350}}/>
      <Apps sx={{width: 410}}/>
    </Stack>
  )
}

export default Attentions