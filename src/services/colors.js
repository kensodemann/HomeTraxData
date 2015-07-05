'use strict';

var pallets = [
  ['#303030', '#606060', '#909090', '#C0C0C0'],
  ['#006600', '#006666', '#009999', '#006699'],
  ['#660000', '#660033', '#660066', '#660099'],
  ['#000066', '#000099', '#0000CC', '#0000FF'],
  ['#FF0000', '#FF0066', '#FF0099', '#FF00FF'],
  ['#FFFF00', '#FFFF99', '#99FF00', '#99FF99']
];

exports.userPallets = pallets;

exports.getPallet = function(idx) {
  return pallets[idx %  pallets.length];
};