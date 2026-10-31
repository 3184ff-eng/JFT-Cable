sub init()
 m.top.functionName="loadFeed"
end sub

sub loadFeed()
 transfer=CreateObject("roUrlTransfer")
 port=CreateObject("roMessagePort")
 transfer.SetMessagePort(port)
 transfer.SetCertificatesFile("common:/certs/ca-bundle.crt")
 transfer.InitClientCertificates()
 transfer.SetUrl(m.top.url)
 transfer.AddHeader("Cache-Control","no-cache")
 if not transfer.AsyncGetToString()
  m.top.result={ok:false,message:"Could not start GitHub feed request."}
  return
 end if
 event=wait(20000,port)
 if event=invalid
  transfer.AsyncCancel()
  m.top.result={ok:false,message:"GitHub feed request timed out."}
  return
 end if
 if event.GetResponseCode()<>200
  m.top.result={ok:false,message:"GitHub feed HTTP "+event.GetResponseCode().ToStr()}
  return
 end if
 data=ParseJson(event.GetString())
 if type(data)<>"roAssociativeArray"
  m.top.result={ok:false,message:"GitHub feed is not valid JSON."}
  return
 end if
 if data.schemaVersion<>1 or type(data.items)<>"roArray"
  m.top.result={ok:false,message:"Unsupported GitHub feed format."}
  return
 end if
 m.top.result={ok:true,items:data.items}
end sub
