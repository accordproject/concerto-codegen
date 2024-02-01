# Concerto CodeGen
Model converters and codegen for [Concerto](https://github.com/accordproject/concerto/) format model files.

## Install

```
npm install @accordproject/concerto-codegen --save
```

## Use

### Benchmark Model Generator

This API allows you to generate models of varying sizes which can be used to test the performance of your Concerto-handling code.

#### Generate a model up to a specified number of declarations and properties

You can generate a model up to a specified number of declarations and properties using:

```js
const benchmarkModelGenerator = new BenchmarkModelGenerator();
const generated = benchmarkModelGenerator.generateConcertoModels({
    nDeclarations: 5, // Number of declarations in the model
    nProperties: 5, // Number of properties per declaration
});
```

#### Generate a model up to a specified size in bytes

You can generate a model up to a specified size in bytes, however you would need to specify how that model should grow.

##### Grow model by number of declarations

If you'd like to grow it by number of declarations, you will need to specify the number of properties that you wish the model to have (defaults to `1`):

```js
const benchmarkModelGenerator = new BenchmarkModelGenerator();
const generated = benchmarkModelGenerator.generateConcertoModels({
    generateUpToSize: 10000, // Target upper limit of growth in bytes
    growBy: 'declarations', // Element type by which the model should grow
    nProperties: 5, // Number of properties per declaration
});
```

##### Grow model by number of properties

If you'd like to grow it by number of properties, you will need to specify the number of declarations that you wish the model to have (defaults to `1`):

```js
const benchmarkModelGenerator = new BenchmarkModelGenerator();
const generated = benchmarkModelGenerator.generateConcertoModels({
    generateUpToSize: 10000, // Target upper limit of growth in bytes
    growBy: 'properties', // Element type by which the model should grow
    nProperties: 5, // Number of declarations in the model
});
```

The expected response will include an array of generated `models` (currently containing only a single model) and a `metadata` object with information about the generated model e.g:

```js
{
  models: [
    {
      '$class': 'concerto.metamodel@1.0.0.Model',
      decorators: [],
      namespace: 'generated.model@1.0.0',
      imports: [],
      declarations: [
        ...
      ]
    }
  ],
  metadata: {
    requestedModelSizeInBytes: 10000,
    humanReadableRequestedModelSize: '9.77 KiB',
    generatedModelSizeInBytes: 9952,
    humanReadableGeneratedModelSize: '9.72 KiB',
    declarationsN: 5,
    propertiesNInSmallestDeclaration: 15,
    propertiesNInLargestDeclaration: 16
  }
}
```

As you can see from the above example model, the generator will try its best to reach the upper `generateUpToSize` reqested size, but may fall short by a few bytes.

## License <a name="license"></a>
Accord Project source code files are made available under the Apache License, Version 2.0 (Apache-2.0), located in the LICENSE file. Accord Project documentation files are made available under the Creative Commons Attribution 4.0 International License (CC-BY-4.0), available at http://creativecommons.org/licenses/by/4.0/.

