var Commits = (function() {

  var extend = function(obj) {
    [].slice.call(arguments, 1).forEach(function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop]
        }
      }
    })
    return obj
  }

  // Micro templating
  var render = function(string, data) {
    for(var s in data) {
      string = string.replace(new RegExp('{'+s+'}', 'g'), data[s])
    }
    return string
  }

  // Create a template function bound to a
  // template string ready for rendering data
  // Usage: var tmpl = compile('Hi {name}')
  //        var rendered = tmpl({name: 'Johan'})
  //        => 'Hi Johan'
  var compile = function(string) {
    return render.bind(this, string)
  }

  var transformData = function(json) {
    var tagsToReplace = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;'
    };

    function replaceTag(tag) {
      return tagsToReplace[tag] || tag;
    }

    function safe_tags_replace(str) {
      return str.replace(/[&<>]/g, replaceTag);
    }

    // => HH:MM
    function formatDate(timestamp) {
      return timestamp.match(/T(\d{2}:\d{2})/)[1]
    }

    function parseTeam(commitUrl) {
      return commitUrl.replace("https://api.github.com/repos/hackforrefugees/", "");
    }

    var message = json.payload.commits[0].message || '';

    if(/<script>(.+)<\/script>/.test(json.message)) {
      message = "*** Look, I'm a script kiddie, tihi! ***"
    }

    message = safe_tags_replace(message);

    return extend({}, json, {
      message: message,
      by: json.actor.login || json.payload.commits[0].author.name,
      date: formatDate(json.created_at),
      team: parseTeam(json.repo.url)
    })
  }

  var commitIsMerge = function(json) {
    return /^Merge branch/.test(json.message)
  }

  return {

    setPoller: function (poller) {
      this._p = poller
      return this
    },

    run: function(limit) {
      this._limit = (limit || this._limit) || 8

      this._p.on('data', function(data){
        data.commits.map(this.render.bind(this))
      }.bind(this));

      return Object.create(this)
    },

    templateString: function(content) {
      this.template = compile(content)
      return this
    },

    limit: function(limit) {
      this._limit = limit
      return this
    },

    setElement: function(selector) {
      this.$el = $(selector)
      return this
    },

    render: function(data) {
      if(!this.template) {
        throw "No template provided! Call Commits.templateString with a string"
      }
      if(!data.payload.commits || data.payload.commits.length === 0) return;
      if(commitIsMerge(data.payload.commits[0].message)) return

      if(data.payload.commits[0].message.indexOf() === "NOTICE:") location.reload();

      var json = transformData(data)

      this.$el.prepend(this.template(json))
      return this
    }
  }
})()

var CommitsCounter = (function () {

  var increaseCounter = function (data) {
    this._counter = data.total;

    this.$el
      .text(this._counter)

    return this
  }

  return {

    setPoller: function (poller) {
      this._p = poller
      return this
    },

    setElement: function (selector) {
      this.$el = $(selector)
      return this
    },

    run: function () {
      this._counter = 0

      this._p
        .on('data', increaseCounter.bind(this))

      return Object.create(this)
    }
  }
}())

$(function() {

  Commits
    .setPoller(Poller)
    .setElement('#commits')
    .templateString($("#commit-template").html())
    .run()

  CommitsCounter
    .setPoller(Poller)
    .setElement('#commit-counter')
    .run()

  Poller.start();
})
