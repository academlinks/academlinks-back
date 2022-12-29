export default class API_Features {
  constructor(doc, query) {
    this.doc = doc;
    this.query = query;
  }

  selectFields(fields) {
    this.doc = this.doc.select(fields);

    return this;
  }

  filter() {
    const availableKeys = ["gender", "createdAt", "birthDate", "userName"];

    let queryToModify = {};
    const queryKeys = Object.keys(this.query);
    queryKeys
      .filter((key) => availableKeys.includes(key))
      .map((key) => (queryToModify[key] = this.query[key]));

    // Fillter Living Place
    const livingPlaceQueries = [
      "currCity",
      "currCountry",
      "fromCity",
      "fromCountry",
    ];

    if (queryKeys.some((key) => livingPlaceQueries.includes(key))) {
      let livingPlaceQueryKeys = queryKeys.filter((key) =>
        livingPlaceQueries.includes(key)
      );

      const livingPlaceQuery = {};
      livingPlaceQueryKeys
        .map((key) => {
          if (key === "currCity")
            return { "currentLivingPlace.city": this.query[key] };

          if (key === "currCountry")
            return { "currentLivingPlace.country": this.query[key] };

          if (key === "fromCity") return { "from.city": this.query[key] };

          if (key === "fromCountry") return { "from.country": this.query[key] };
        })
        .map((obj) =>
          Object.keys(obj).forEach((key) => (livingPlaceQuery[key] = obj[key]))
        );

      queryToModify = {
        ...queryToModify,
        ...livingPlaceQuery,
      };
    }

    if (this.query.position)
      queryToModify["workplace.position"] = this.query.position;

    const finalQuery = JSON.parse(
      JSON.stringify(queryToModify).replace(
        /gt|gte|lt|lte|regex/g,
        (match) => `$${match}`
      )
    );

    this.doc = this.doc.find(finalQuery);

    return this;
  }

  pagination() {
    if (!this.query.page) return this;

    const limit = this.query.limit || 10;
    const page = this.query.page;

    const skip = (page - 1) * limit;

    this.doc = this.doc.skip(skip).limit(limit);

    return this;
  }

  sort() {
    if (this.query.sort) {
      const sortBy = this.query.sort.split(",").join(" ");
      this.doc = this.doc.sort(sortBy);
    } else this.doc = this.doc.sort("-createdAt");

    return this;
  }

  countDoc(data) {
    if (this.query.hasMore && JSON.parse(this.query.hasMore))
      return { count: data.length, isRequested: true };
    else return { count: null, isRequested: true };
  }

  async execute() {
    const data = await this.doc;
    const docCount = this.countDoc(data);
    return { docCount, data };
  }
}
