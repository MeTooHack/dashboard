
var Poller = (function() {
  var ACCESS_TOKEN = '?access_token=2dd8913aaed3' + 'cfc5c2b32' + '430acbb9fa51ed1ee47';
  var LATEST_COMMITS_URL = 'https://api.github.com/orgs/hackforrefugees/events' + ACCESS_TOKEN,
      REPOS_URL = 'https://api.github.com/orgs/hackforrefugees/repos' + ACCESS_TOKEN;

      totalCommits = 0,
      etag = "",
      data = [],
      isPolling = false,
      poller = false,
      INTERVAL_IN_MS = 4000,

      //data
      eventListeners = [];


  function saveETag(response){
    etag = response.headers.get('Etag');
    return response;
  }

  function updateData(json){
    if(!json) return false;

    var latestId = data[0] ? data[0].id : json[json.length-1].id;
    var index = 0;

    for(var i = 0; i < json.length; i++){
      if(json[i].id === latestId) {
        index = i;
        break;
      }
    }

    data = (json.slice(0, index)).concat(data);

    if(eventListeners["data"]){
      eventListeners["data"].map(function(cb){
        cb({commits:json.slice(0, index), total: totalCommits});
      });
    }

    return data;
  }

  function parseJSON(response) {
    if(response.status === 304) return false;

    if (response.status === 200) {
      return response.json();
    }

    //Oh shit, errors!
    var error = new Error(response.statusText);
    error.response = response;
    throw error;
  }


  function printResults(gotNewData){
    console.log((gotNewData ? "200 - Got data " : "304 - Not modified ") + ' (' + etag + ')');
  }

  function fetchData(){
    fetch(LATEST_COMMITS_URL, {
      headers: {
        "If-None-Match": etag
    }})
      .then(saveETag)
      .then(parseJSON)
      .then(updateData)
      .then(printResults)
      // .catch(function(ex) {
      //   console.log('Error: ', ex)
      // })
  }

  function initIsDone(commitCount){
    totalCommits = commitCount.reduce(function(a, b) { return a + b; }, 0);
    fetchData();
    poller = setInterval(fetchData, INTERVAL_IN_MS);
  }

  function initiate(){
    fetch(REPOS_URL)
      .then(function(response){
        return response.json();
      })
      .then(function(repos){
        return repos.map(function(repo){

          if(repo.url.indexOf("hackoutwest.github.io") >= 0) return;

          fetch(repo.url + '/stats/contributors' + ACCESS_TOKEN)
            .then(function(response){
              return response.json();
            })
            .then(function(contributors){
              if(contributors.length === 0) return 0;
              return contributors.map(function(contributor){
                console.log(contributor.total)
                return contributor.total || 0
              })
            })
            .then(initIsDone);
        })
      })
  }

  function startPolling(){
    if(isPolling) return;
    isPolling = true;
    initiate();
  }

  function stopPolling(){
    isPolling = false;
    clearInterval(poller);
  }

  function addEventListener(eventName, cb){
    if(!eventListeners[eventName]) eventListeners[eventName] = [];

    eventListeners[eventName].push(cb);
  }

  return {
    start: startPolling,
    stop: stopPolling,
    on: addEventListener
  }
})()

