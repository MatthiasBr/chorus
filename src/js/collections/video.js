
/**
 * A collection of Movies.
 *
 * a page number can be passed for pagination, when first init it caches a lightweight
 * version on all movies for placeholders that can be found here app.stores.movies
 *
 * A fully loaded and range limited collection is provided in success callback
 */
app.MovieCollection = Backbone.Collection.extend({
  model: app.Movie,

  cached: [],
  fullyLoaded: false,

  sync: function(method, model, options) {
    if (method === "read") {


      // Get a paginated
      var self = this,
        fullRange = (typeof options.fullRange != 'undefined' && options.fullRange === true);


      // load up a full cache for pagination
      app.cached.moviesPage = new app.MovieAllCollection();
      app.cached.moviesPage.fetch({"success": function(model){


        // return pagination from cache if exists
        var cache = self.cachedPagination(app.moviePageNum, fullRange);
        if(cache !== false){
          options.success(cache);
          return;
        }

        // model for params
        var args = {
          range: app.helpers.createPaginationRange(app.moviePageNum, fullRange)
        };

        // prep empty cache
        if(typeof app.stores.movies == 'undefined'){
          app.stores.movies = {};
        }
        // set the container
        app.stores.movies[app.moviePageNum] = [];

        // init the xbmc collection
        app.cached.movieXbmcCollection = new app.MovieXbmcCollection(args);
        // fetch results
        app.cached.movieXbmcCollection.fetch({"success": function(data){

          if(!fullRange || app.moviePageNum === 0){
            // add models to cache if not a fullRange
            $.each(data.models,function(i,d){
              app.stores.movies[app.moviePageNum].push(d);
            });
          }

          // if models less than ipp then must be the end
          if(data.models.length > app.itemsPerPage){
            self.fullyLoaded = true;
          }
          // return callback
          options.success(data.models);
          return data.models;
        }});




      }});

      //return this

    }
  },


  /**
   * Returns a set of results if in cache or false if a lookup is required
   * @param pageNum
   * @param fullRange
   */
  cachedPagination: function(pageNum, fullRange){


    // always lookup if no cache
    if(app.stores.movies === undefined ||
      app.stores.movies[pageNum] === undefined ||
      app.stores.movies[pageNum].length === 0){
        return false;
    }

    var cache = app.stores.movies[pageNum],
      full = [];

    // full range requires us to loop over each and append to a full array
    if(fullRange){
      for(i = 0; i <= pageNum; i++){
        // we are missing a page, lookup again
        if(app.stores.movies[i] === undefined){
          return false;
        }
        for(var n in app.stores.movies[i]){
          full.push(app.stores.movies[i][n]);
        }
      }
      cache = full;
    }

    return cache;
  }

});


/**
 * A collection of Recently added Movies.
 */
app.MovieRecentCollection = Backbone.Collection.extend({
  model: app.Movie,

  cached: [],
  fullyLoaded: false,

  sync: function(method, model, options) {

    var opt = [app.movieFields, {'end': 100, 'start': 0}];
    app.xbmcController.command('VideoLibrary.GetRecentlyAddedMovies', opt, function(data){
      options.success(data.result.movies);
    });

  }

});


/**
 * A collection of movies matching a filter
 */
app.MovieFitleredCollection = Backbone.Collection.extend({
  model: app.Movie,

  sync: function(method, model, options) {

    // init cache
    if(app.stores.moviesFiltered === undefined){
      app.stores.moviesFiltered = {};
    }

    var sort = {"sort": {"method": "title"}},
      opt = [app.movieFields, {'end': 500, 'start': 0}, sort, options.filter],
      key = 'movies:key:filter';

    // cache
    for(var k in options.filter){
      key = 'movies:' + k + ':' + options.filter[k];
    }

    // if cache use that
    if(app.stores.moviesFiltered[key] !== undefined){
      // return from cache
      options.success(app.stores.moviesFiltered[key]);
    } else {
      // else lookup
      app.xbmcController.command('VideoLibrary.GetMovies', opt, function(data){
        // save cache
        app.stores.moviesFiltered[key] = data.result.movies;
        // return
        options.success(data.result.movies);
      });
    }

  }

});


/**
 * A lightweight collection of all movies (cached).
 */
app.MovieAllCollection = Backbone.Collection.extend({
  model: app.Movie,

  sync: function(method, model, options) {

    if(typeof app.stores.allMovies == 'undefined'){

      // no cache, do a lookup
      var allMovies = new app.AllMovieXbmcCollection();
      allMovies.fetch({"success": function(data){
        // Sort
        data.models.sort(function(a,b){ return app.helpers.aphabeticalSort(a.attributes.label, b.attributes.label);	});

        // Make a dictionary and flag as not loaded
        app.stores.allMoviesLookup = {};
        for(var i in data.models){
          var m = data.models[i].attributes;
          m.loaded = false;
          app.stores.allMoviesLookup[m.movieid] = m;
          data.models[i].attributes = m;
        }
        // Cache
        app.stores.allMovies = data.models;
        // Return
        options.success(data.models);
        // trigger
        $(window).trigger('allMoviesCached');
      }});
    } else {
      // else return cache;
      options.success(app.stores.allMovies);
    }

  }

});


/**
* A collection of movies based on a custom array of movie ids
* requires an a property of items[] in options
*/
app.CustomMovieCollection = Backbone.Collection.extend({
  model: app.Movie,

  sync: function(method, model, options) {

    app.xbmcController.entityLoadMultiple('movie', options.items, function(movies){
      options.success(movies);
    });

  }

});



/************************************
 * TV
 ***********************************/

/**
 * A lightweight collection of all movies (cached).
 */
app.TvshowAllCollection = Backbone.Collection.extend({
  model: app.TVShow,

  sync: function(method, model, options) {

    if(typeof app.stores.allTvshows == 'undefined'){

      // no cache, do a lookup
      var allTv = new app.AllTvshowXbmcCollection();
      allTv.fetch({"success": function(data){
        // Sort
        data.models.sort(function(a,b){ return app.helpers.aphabeticalSort(a.attributes.label, b.attributes.label);	});

        // Make a dictionary and flag as not loaded
        app.stores.allTvshowsLookup = {};
        for(var i in data.models){
          var m = data.models[i].attributes;
          m.loaded = false;
          app.stores.allTvshowsLookup[m.movieid] = m;
          data.models[i].attributes = m;
        }
        // Cache
        app.stores.allTvshows = data.models;
        // Return
        options.success(data.models);
        // trigger
        $(window).trigger('allTvshowsCached');
      }});
    } else {
      // else return cache;
      options.success(app.stores.allTvshows);
    }

  }

});



/**
 * A collection of movies matching a filter
 */
app.TvseasonCollection = Backbone.Collection.extend({
  model: app.TVShow,

  sync: function(method, model, options) {

    // init cache
    if(app.stores.TvSeasons === undefined){
      app.stores.TvSeasons = {};
    }

    var sort = {"sort": {"method": "title"}},
      opt = [options.tvshowid, [ "season", "playcount", "watchedepisodes","episode",  "thumbnail", "tvshowid"]],
      key = 'seasons:' + options.tvshowid;


    // if cache use that
    if(app.stores.TvSeasons[key] !== undefined){
      // return from cache
      options.success(app.stores.TvSeasons[key]);
    } else {
      // else lookup
      app.xbmcController.command('VideoLibrary.GetSeasons', opt, function(data){

        // add url
        for(var i in data.result.seasons){
          data.result.seasons[i].url = '#tvshow/' + options.tvshowid + '/' + data.result.seasons[i].season;
        }

        // save cache
        app.stores.TvSeasons[key] = data.result.seasons;
        // return
        options.success(data.result.seasons);
      });
    }

  }

});



/**
 * A collection of movies matching a filter
 */
app.TvepisodeCollection = Backbone.Collection.extend({
  model: app.TVShow,

  sync: function(method, model, options) {

    // init cache
    if(app.stores.TvEpisodes === undefined){
      app.stores.TvEpisodes = {};
    }


    var sort = {"sort": {"method": "title"}},
      opt = [],
      key = 'episodes:' + options.tvshowid + ':' + options.season;

    // constuct params
    opt.push(parseInt(options.tvshowid));
    if(options.season !== undefined){
      opt.push(parseInt(options.season));
      opt.push(app.tvepisodeFields);
    }

    // if cache use that
    if(app.stores.TvEpisodes[key] !== undefined){
      // return from cache
      options.success(app.stores.TvEpisodes[key]);
    } else {
      // else lookup
      app.xbmcController.command('VideoLibrary.GetEpisodes', opt, function(data){

        // add url
        for(var i in data.result.episodes){
          data.result.episodes[i].url = '#tvshow/' + options.tvshowid + '/' + options.season + '/' + data.result.episodes[i].episodeid;
        }

        // Sort
        data.result.episodes.sort(function(a,b){ return app.helpers.aphabeticalSort(a.label, b.label);	});

        // save cache
        app.stores.TvEpisodes[key] = data.result.episodes;

        // return
        options.success(data.result.episodes);
      });
    }

  }

});

