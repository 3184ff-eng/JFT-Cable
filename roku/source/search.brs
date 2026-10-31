function normalizeSearch(value as String) as String
 cleaner=CreateObject("roRegex","[^a-z0-9]+","i")
 return cleaner.ReplaceAll(LCase(value)," ").Trim()
end function

function titleMatchesQuery(title as String,query as String) as Boolean
 normalizedTitle=normalizeSearch(title)
 normalizedQuery=normalizeSearch(query)
 if normalizedQuery="" then return true
 for each word in normalizedQuery.Split(" ")
  if Instr(1,normalizedTitle,word)=0 then return false
 end for
 return true
end function

'//# sourceMappingURL=../../bundle/source/search.brs.map