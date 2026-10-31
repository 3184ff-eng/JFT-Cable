
sub showItem()
 c=m.top.itemContent
 if c=invalid then return
 m.top.findNode("name").text=c.title
 m.top.findNode("poster").uri=c.HDPosterUrl
 m.top.findNode("badge").text=c.shortDescriptionLine1
end sub

'//# sourceMappingURL=../../bundle/components/MovieCard.brs.map